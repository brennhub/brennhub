import type { Dir } from "./play";

/**
 * 플레이 사운드 — Web Audio 합성. 음원 파일 없음(라이선스·번들 size 0, brennhub
 * 단일 스택 정신 일관). lib/maze/*.ts 모듈 패턴 — 페이지 전역 singleton.
 *
 * 이벤트:
 *   - move:    매우 짧고 subtle (자주 울림, 거슬림 위험 최대)
 *   - blocked: 살짝 더 길고 낮은 thud. "같은 방향 연속 차단 → 첫 1회만" 억제
 *              (방향키 오토리핏으로 thud가 드론처럼 겹치는 문제 차단).
 *   - win:     짧은 모티프 1회 (C major 분산)
 *
 * Autoplay 정책: AudioContext는 user gesture 안 resume 필수. PlayMode mount 시
 * `init()`이 첫 진입(StepNav "플레이" 클릭의 후속) → 일반 브라우저 통과.
 * iOS Safari 등 edge에 대비해 매 사운드 호출이 `init()` 재호출 — idempotent resume.
 *
 * play.ts(순수 결정론)는 사운드 호출 X. PlayMode가 `applyMove` 결과를 비교해 트리거.
 * blocked 감지 = `next === prev` reference equality (applyMove가 차단 시 같은 객체 반환,
 * P3b 결정 + 0.10.0 Phase A 직사각 일반화 후에도 유지 — play.ts L58/64/66 확인됨).
 */

const STORAGE_KEY = "brennhub-maze-sound-muted";

/** 이동 사운드 호출 간격 cap — 키 오토리핏으로 사운드 쌓이지 않게. */
const MOVE_THROTTLE_MS = 50;

// === 합성 파라미터 (Q4 캐릭터) ===
const MOVE_FREQ_HZ = 440;
const MOVE_DURATION_S = 0.04;
const MOVE_GAIN = 0.07;

const BLOCKED_FREQ_HZ = 200;
const BLOCKED_DURATION_S = 0.1;
const BLOCKED_GAIN = 0.1;

/** C5 / E5 / G5 — C major chord 분산. */
const WIN_NOTES_HZ = [523.25, 659.25, 783.99];
const WIN_NOTE_DURATION_S = 0.15;
const WIN_NOTE_SPACING_S = 0.1;
const WIN_GAIN = 0.16;

export type SoundController = {
  /** AudioContext 생성/resume. idempotent — 첫 호출 시 생성, 그 후엔 resume 시도. */
  init(): void;
  /** 매 이동 성공 시. 50ms 스로틀로 연속 이동 사운드 쌓임 차단. */
  playMove(): void;
  /** 벽/경계 부딪힘 시. 같은 방향 연속 차단은 첫 1회만 발화(오토리핏 드론 방지). */
  playBlocked(dir: Dir): void;
  /** 도착점 도달 1회. */
  playWin(): void;
  /** 음소거 토글 — localStorage 영속. */
  setMuted(muted: boolean): void;
  isMuted(): boolean;
};

class SoundControllerImpl implements SoundController {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastMoveAt = 0;
  /** 마지막으로 발화된 blocked 방향 — 같은 방향 연속 차단 억제. */
  private lastBlockedDir: Dir | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.muted = window.localStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        // localStorage 접근 불가 (Safari private 등) — 메모리 default.
      }
    }
  }

  init(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
    }
    if (this.ctx.state !== "running") {
      void this.ctx.resume().catch(() => {
        /* 정책상 거부 — 다음 user gesture에서 재시도 */
      });
    }
  }

  playMove(): void {
    if (this.muted) return;
    const now = Date.now();
    if (now - this.lastMoveAt < MOVE_THROTTLE_MS) return;
    this.lastMoveAt = now;
    // 성공 이동 → blocked 억제 상태 리셋 (다음 벽 부딪힘은 다시 발화).
    this.lastBlockedDir = null;
    this.beep(MOVE_FREQ_HZ, MOVE_DURATION_S, MOVE_GAIN, "sine");
  }

  playBlocked(dir: Dir): void {
    if (this.muted) return;
    // 같은 방향 연속 차단 = 첫 1회만 발화. 방향키 오토리핏 thud 드론 방지.
    // 성공 이동 또는 다른 방향 차단으로 lastBlockedDir이 리셋/변경되어야 재발화.
    if (this.lastBlockedDir === dir) return;
    this.lastBlockedDir = dir;
    this.beep(BLOCKED_FREQ_HZ, BLOCKED_DURATION_S, BLOCKED_GAIN, "triangle");
  }

  playWin(): void {
    if (this.muted) return;
    this.lastBlockedDir = null;
    this.beepSequence(
      WIN_NOTES_HZ,
      WIN_NOTE_DURATION_S,
      WIN_NOTE_SPACING_S,
      WIN_GAIN,
    );
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(muted));
      } catch {
        // 저장 실패 — 세션 내에선 메모리 상태 그대로 유지.
      }
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  /** 단일 톤 발화. attack/decay envelope으로 click 차단. */
  private beep(
    freq: number,
    duration: number,
    gain: number,
    type: OscillatorType,
  ): void {
    this.init(); // idempotent resume — autoplay 폴백
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.005);
    env.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(env).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /** 멜로디 — 음 시퀀스 (win 사운드 분산 코드용). */
  private beepSequence(
    freqs: readonly number[],
    duration: number,
    spacing: number,
    gain: number,
  ): void {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const baseTime = ctx.currentTime;
    for (let i = 0; i < freqs.length; i += 1) {
      const start = baseTime + i * spacing;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freqs[i];
      env.gain.setValueAtTime(0, start);
      env.gain.linearRampToValueAtTime(gain, start + 0.005);
      env.gain.linearRampToValueAtTime(0, start + duration);
      osc.connect(env).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.01);
    }
  }
}

let controller: SoundController | null = null;

/** 페이지 전역 SoundController singleton. 첫 호출 시 lazy 생성. */
export function getSoundController(): SoundController {
  if (!controller) controller = new SoundControllerImpl();
  return controller;
}
