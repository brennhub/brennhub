/**
 * 의식 앰비언트 BGM — 음원 파일 재생 (Web Audio, 외부 라이브러리 0).
 * 0.4.1에서 합성 엔진(드론+종소리) 제거 — 편집장 판정: 합성 드론이 리딩에 방해.
 * 합성 구현은 git 히스토리 참조 (0.4.0, lib/tarot/ambient.ts).
 *
 * 수명주기: [리딩 시작] gesture에서 start()(autoplay 정책) → 디코드 완료 시점
 * 페이드인(S1 그라운딩 7초가 자연 로딩 버퍼) → S1~S7 루프 유지 → S8 진입 stop()
 * 페이드아웃("답은 침묵 속에서"). visibilitychange 시 suspend/resume.
 * 로드/디코드 실패 = 무음 폴백 (콘솔 경고만, UI 에러 없음).
 */

// ── 사운드 파라미터 (편집장 체감 후 조정 전제 — 이 블록만 만지면 된다) ──────────
const AMBIENT_URL = "/tarot/ambient.mp3";
const MASTER_LEVEL = 0.35; // 음원용 시작값 — 합성(0.16)보다 트랙 자체가 잔잔해 상향
const FADE_IN_S = 2.5;
const FADE_OUT_S = 1.8;
const GAIN_FLOOR = 0.0001; // exponentialRamp는 0 불가 — 공용 바닥값
const MUTE_FADE_TAU = 0.04; // setTargetAtTime τ — 약 160ms에 수렴(클릭 노이즈 0)
/** 루프 경계 — 실측(2026-06-12, V5 재인코딩본 재실측 동일): 머리는 t=0부터 음악
 *  레벨(페이드 없음), 꼬리 페이드는 ~246.5s 시작(245s 지점 RMS 0.058 = 음악 레벨)
 *  → 245s로 당겨 루프 클릭 방지. 트랙 총 249.9s(디코더가 인코더 패딩 보정). */
const LOOP_START_S = 0;
const LOOP_END_S = 245;
// ──────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "brennhub-tarot-ambient-muted";

export type AmbientController = {
  /** user gesture 핸들러 안에서 호출 — ctx 생성/resume + 버퍼 확보 + 페이드인. idempotent. */
  start(): void;
  /** 페이드아웃 후 세션 노드 정리. idempotent — 미재생 시 no-op. */
  stop(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
};

function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // Safari private 등 — 기본 ON(비음소거)
  }
}

function saveMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // 저장 실패 — 세션 내 메모리 상태만 유지
  }
}

type Session = {
  gen: number;
  sessionGain: GainNode;
  source: AudioBufferSourceNode | null; // 디코드 완료 전엔 null
  fadingOut: boolean;
};

function createAmbientController(): AmbientController {
  // ── 페이지 수명 (1회 생성, close 금지 — 재사용) ──
  let ctx: AudioContext | null = null;
  let muteGain: GainNode | null = null; // mute 전담 — 세션 페이드와 분리
  let muted = loadMuted();
  let visibilityHandler: (() => void) | null = null;
  /** 디코드 결과 캐시 — 실패도 null로 캐시(재시도 안 함 = 무음 폴백 확정). */
  let bufferPromise: Promise<AudioBuffer | null> | null = null;

  // ── 세션 (의식 1회분) ──
  let session: Session | null = null;
  let generation = 0;

  const ensureCtx = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
      } catch {
        return null;
      }
      muteGain = ctx.createGain();
      muteGain.gain.value = muted ? 0 : 1;
      muteGain.connect(ctx.destination);
    }
    return ctx;
  };

  const ensureBuffer = (c: AudioContext): Promise<AudioBuffer | null> => {
    if (!bufferPromise) {
      bufferPromise = fetch(AMBIENT_URL)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then((ab) => c.decodeAudioData(ab))
        .catch((err) => {
          console.warn("tarot ambient: 음원 로드/디코드 실패 — 무음 폴백", err);
          return null;
        });
    }
    return bufferPromise;
  };

  const onVisibilityChange = () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend().catch(() => {});
    } else if (session && !session.fadingOut) {
      // 최초 gesture로 unlock된 ctx의 programmatic resume — autoplay 정책 비대상
      void ctx.resume().catch(() => {});
    }
  };

  return {
    start() {
      const c = ensureCtx();
      if (!c || !muteGain) return;
      if (session && !session.fadingOut) return; // 재생 중 — idempotent
      if (c.state !== "running") {
        void c.resume().catch(() => {
          // 정책상 거부 — 다음 gesture(setMuted/visible)에서 재시도
        });
      }

      generation += 1;
      const sessionGain = c.createGain();
      sessionGain.connect(muteGain);
      const s: Session = { gen: generation, sessionGain, source: null, fadingOut: false };
      session = s;

      if (!visibilityHandler) {
        visibilityHandler = onVisibilityChange;
        document.addEventListener("visibilitychange", visibilityHandler);
      }

      // 디코드 완료 시점에 재생 + 페이드인 — S1 그라운딩(7s)이 자연 로딩 버퍼.
      // 그 사이 stop()/새 start()가 일어나면 gen·fadingOut 가드가 중단한다.
      void ensureBuffer(c).then((buffer) => {
        if (!buffer || session?.gen !== s.gen || s.fadingOut) return;
        const source = c.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.loopStart = LOOP_START_S;
        source.loopEnd = Math.min(LOOP_END_S, buffer.duration);
        source.connect(s.sessionGain);
        const now = c.currentTime;
        s.sessionGain.gain.setValueAtTime(GAIN_FLOOR, now);
        s.sessionGain.gain.exponentialRampToValueAtTime(MASTER_LEVEL, now + FADE_IN_S);
        source.start(now, LOOP_START_S);
        s.source = source;
      });
    },

    stop() {
      const c = ctx;
      const s = session;
      if (!c || !s || s.fadingOut) return;
      s.fadingOut = true; // 디코드 대기 중이던 start 비동기부도 이 플래그로 중단

      const now = c.currentTime;
      const running = c.state === "running";
      const fadeS = running && s.source ? FADE_OUT_S : 0; // suspended/미재생 — 즉시 정리
      if (running && s.source) {
        const g = s.sessionGain.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(g.value, GAIN_FLOOR), now); // 앵커 — 점프 방지
        g.exponentialRampToValueAtTime(GAIN_FLOOR, now + fadeS);
      }
      if (s.source) {
        try {
          s.source.stop(now + fadeS + 0.1); // 오디오 클럭 — 탭 스로틀 무관
        } catch {
          // 이미 stop된 source — 무시
        }
      }

      const gen = s.gen;
      session = null; // 즉시 해제 — 새 start()는 새 세션을 빌드
      setTimeout(
        () => {
          // 그 사이 새 세션이 시작됐으면(generation 전진) suspend·리스너 해제 금지
          if (generation !== gen) return;
          s.sessionGain.disconnect();
          if (visibilityHandler) {
            document.removeEventListener("visibilitychange", visibilityHandler);
            visibilityHandler = null;
          }
          void c.suspend().catch(() => {}); // S8을 오래 읽는 동안 배터리 절약 — 다음 start()에서 resume
        },
        (fadeS + 0.2) * 1000,
      );
    },

    setMuted(next: boolean) {
      muted = next;
      saveMuted(next);
      if (ctx && muteGain) {
        const now = ctx.currentTime;
        muteGain.gain.cancelScheduledValues(now);
        // 짧은 페이드 (τ=40ms ≈ 160ms 수렴) — setTargetAtTime은 목표 0 허용
        muteGain.gain.setTargetAtTime(next ? 0 : 1, now, MUTE_FADE_TAU);
        // 켜기는 gesture — iOS unlock 실패 폴백 겸 resume 재시도
        if (!next && ctx.state !== "running" && session && !session.fadingOut) {
          void ctx.resume().catch(() => {});
        }
      }
    },

    isMuted() {
      return muted;
    },
  };
}

let controller: AmbientController | null = null;

/** 페이지 전역 1개 — StrictMode 리마운트·클라이언트 네비게이션과 무관하게 동일 인스턴스. */
export function getAmbientController(): AmbientController {
  if (!controller) controller = createAmbientController();
  return controller;
}
