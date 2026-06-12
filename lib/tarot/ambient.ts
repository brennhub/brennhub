/**
 * 의식 앰비언트 BGM — raw Web Audio 합성 (외부 라이브러리·오디오 파일 0).
 * 저음 드론(3-osc 스택 + 느린 필터 스윕) + 드문 종소리(A 메이저 펜타토닉 + 홀 잔향).
 * '신비로움' 지향 — 단2도·트라이톤·고Q 레조넌스·비조화 partial 회피(공포·불안 지양).
 *
 * 수명주기: [리딩 시작] gesture에서 start()(autoplay 정책) → S1~S7 유지 →
 * S8 진입 stop() 페이드아웃("답은 침묵 속에서"). visibilitychange 시 suspend/resume.
 *
 * 패턴 출처: lib/shooter/sound.ts(클로저 팩토리·masterGain·임펄스 리버브) +
 * lib/maze/sound.ts(lazy 싱글톤·localStorage try-catch).
 *
 * NOTE: ritual.ts의 Math.random 금지는 카드 결과 공정성(커밋-리빌) 영역 —
 * BGM 음 선택·간격은 리딩 결과와 무관하므로 의도적으로 Math.random을 쓴다.
 */

// ── 사운드 파라미터 (편집장 체감 후 조정 전제 — 이 블록만 만지면 된다) ──────────
const MASTER_LEVEL = 0.16; // 배경 수준 (shooter sfx 0.5 대비 1/3 이하)
const FADE_IN_S = 2.5;
const FADE_OUT_S = 1.8;
const GAIN_FLOOR = 0.0001; // exponentialRamp는 0 불가 — 공용 바닥값
const MUTE_FADE_TAU = 0.04; // setTargetAtTime τ — 약 160ms에 수렴(클릭 노이즈 0)

/** 드론 스택 — A2 루트 + 완전5도 + 옥타브 (협화만). ±cents 디튠 = 느린 비팅. */
const DRONE_VOICES: ReadonlyArray<{
  type: OscillatorType;
  freq: number;
  detune: number;
  gain: number;
}> = [
  { type: "sine", freq: 110.0, detune: 0, gain: 0.5 }, // A2 루트
  { type: "triangle", freq: 165.0, detune: +5, gain: 0.32 }, // E3 완전5도 — triangle 배음이 필터 스윕을 들리게
  { type: "sine", freq: 220.0, detune: -6, gain: 0.22 }, // A3 옥타브
];
const FILTER_BASE_HZ = 450;
const FILTER_Q = 0.8; // 높은 Q = 휘슬 = 불안감 → 낮게 고정
const LFO_HZ = 0.02; // 주기 50초 — 매우 느린 스윕
const LFO_DEPTH_HZ = 220; // cutoff 230~670Hz 왕복

/** 종소리 — A 메이저 펜타토닉 A5~F#6. 드론(A·E)과 전부 협화. */
const BELL_SCALE_HZ = [880.0, 987.77, 1108.73, 1318.51, 1479.98];
/** 배음 구성 — 3.01×의 미세 비조화로 '차임' 캐릭터만 살짝 (진짜 종의 2.4× 등은 으스스 → 회피). */
const BELL_PARTIALS: ReadonlyArray<{ ratio: number; gain: number }> = [
  { ratio: 1.0, gain: 1.0 },
  { ratio: 2.0, gain: 0.35 },
  { ratio: 3.01, gain: 0.15 },
];
const BELL_LEVEL = 0.4; // sessionGain 통과 전 상대값 — 최종 ≈ 0.064
const BELL_ATTACK_S = 0.008;
const BELL_DECAY_S = 5;
const BELL_FIRST_DELAY_MS: [number, number] = [5000, 10000];
const BELL_INTERVAL_MS: [number, number] = [8000, 20000];
const REVERB_SECONDS = 3.0;
const REVERB_DECAY = 3.0;
const REVERB_WET = 0.45;
// ──────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "brennhub-tarot-ambient-muted";

export type AmbientController = {
  /** user gesture 핸들러 안에서 호출 — ctx 생성/resume + 그래프 빌드 + 페이드인. idempotent. */
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

/** 합성 임펄스 응답 — lib/shooter/sound.ts 패턴 차용, 종소리용 긴 홀 잔향. */
function createImpulseBuffer(c: AudioContext, durationSec: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * durationSec));
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

function randBetween([lo, hi]: [number, number]): number {
  return lo + Math.random() * (hi - lo);
}

type Session = {
  gen: number;
  sessionGain: GainNode;
  sources: OscillatorNode[];
  bellTimer: ReturnType<typeof setTimeout> | null;
  lastNoteIndex: number;
  fadingOut: boolean;
};

function createAmbientController(): AmbientController {
  // ── 페이지 수명 노드 (1회 생성, close 금지 — 재사용) ──
  let ctx: AudioContext | null = null;
  let muteGain: GainNode | null = null; // mute 전담 — 세션 페이드와 분리
  let convolver: ConvolverNode | null = null;
  let wetGain: GainNode | null = null;
  let muted = loadMuted();
  let visibilityHandler: (() => void) | null = null;

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
      convolver = ctx.createConvolver();
      convolver.buffer = createImpulseBuffer(ctx, REVERB_SECONDS, REVERB_DECAY);
      wetGain = ctx.createGain();
      wetGain.gain.value = REVERB_WET;
      convolver.connect(wetGain);
    }
    return ctx;
  };

  /** 종소리 1회 — 사인 partial 스택 + 리버브 send, 긴 페이드 잔향. */
  const ringBell = (s: Session) => {
    if (!ctx || !wetGain) return;
    let noteIndex = Math.floor(Math.random() * BELL_SCALE_HZ.length);
    if (noteIndex === s.lastNoteIndex) {
      noteIndex = (noteIndex + 1 + Math.floor(Math.random() * (BELL_SCALE_HZ.length - 1))) % BELL_SCALE_HZ.length;
    }
    s.lastNoteIndex = noteIndex;
    const baseFreq = BELL_SCALE_HZ[noteIndex];
    const now = ctx.currentTime;
    for (const { ratio, gain } of BELL_PARTIALS) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = baseFreq * ratio;
      env.gain.setValueAtTime(GAIN_FLOOR, now);
      env.gain.linearRampToValueAtTime(BELL_LEVEL * gain, now + BELL_ATTACK_S);
      env.gain.exponentialRampToValueAtTime(GAIN_FLOOR, now + BELL_DECAY_S);
      osc.connect(env);
      env.connect(s.sessionGain); // dry
      env.connect(convolver as ConvolverNode); // 리버브 send
      osc.start(now);
      osc.stop(now + BELL_DECAY_S + 0.1);
      s.sources.push(osc);
    }
  };

  const scheduleBell = (s: Session, delayMs: number) => {
    s.bellTimer = setTimeout(() => {
      // 세션 교체·suspend 중 발화 금지
      if (session?.gen !== s.gen || s.fadingOut) return;
      if (ctx?.state === "running") ringBell(s);
      scheduleBell(s, randBetween(BELL_INTERVAL_MS));
    }, delayMs);
  };

  const onVisibilityChange = () => {
    if (!ctx) return;
    if (document.hidden) {
      if (session?.bellTimer) clearTimeout(session.bellTimer); // suspended ctx에 노트 쌓임 방지
      void ctx.suspend().catch(() => {});
    } else if (session && !session.fadingOut) {
      // 최초 gesture로 unlock된 ctx의 programmatic resume — autoplay 정책 비대상
      void ctx.resume().catch(() => {});
      scheduleBell(session, randBetween(BELL_INTERVAL_MS));
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
      const s: Session = {
        gen: generation,
        sessionGain,
        sources: [],
        bellTimer: null,
        lastNoteIndex: -1,
        fadingOut: false,
      };

      const now = c.currentTime;
      // 페이드인 — 지수 램프 (청감상 자연스러운 데시벨 선형)
      sessionGain.gain.setValueAtTime(GAIN_FLOOR, now);
      sessionGain.gain.exponentialRampToValueAtTime(MASTER_LEVEL, now + FADE_IN_S);

      // 드론: osc → 보이스 gain → lowpass → sessionGain
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = FILTER_BASE_HZ;
      filter.Q.value = FILTER_Q;
      filter.connect(sessionGain);
      for (const v of DRONE_VOICES) {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = v.type;
        osc.frequency.value = v.freq;
        osc.detune.value = v.detune;
        g.gain.value = v.gain;
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        s.sources.push(osc);
      }
      // 매우 느린 필터 스윕: LFO → depth gain → filter.frequency
      const lfo = c.createOscillator();
      const lfoDepth = c.createGain();
      lfo.type = "sine";
      lfo.frequency.value = LFO_HZ;
      lfoDepth.gain.value = LFO_DEPTH_HZ;
      lfo.connect(lfoDepth);
      lfoDepth.connect(filter.frequency);
      lfo.start(now);
      s.sources.push(lfo);

      session = s;
      scheduleBell(s, randBetween(BELL_FIRST_DELAY_MS));

      if (!visibilityHandler) {
        visibilityHandler = onVisibilityChange;
        document.addEventListener("visibilitychange", visibilityHandler);
      }
    },

    stop() {
      const c = ctx;
      const s = session;
      if (!c || !s || s.fadingOut) return;
      s.fadingOut = true;
      if (s.bellTimer) clearTimeout(s.bellTimer);

      const now = c.currentTime;
      const running = c.state === "running";
      const fadeS = running ? FADE_OUT_S : 0; // suspended 중 stop — 페이드 생략 즉시 정지
      if (running) {
        const g = s.sessionGain.gain;
        g.cancelScheduledValues(now);
        g.setValueAtTime(Math.max(g.value, GAIN_FLOOR), now); // 앵커 — 점프 방지
        g.exponentialRampToValueAtTime(GAIN_FLOOR, now + fadeS);
      }
      for (const osc of s.sources) {
        try {
          osc.stop(now + fadeS + 0.1); // 오디오 클럭 — 탭 스로틀 무관
        } catch {
          // 이미 stop 스케줄된 단발 노드(종) — 무시
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
