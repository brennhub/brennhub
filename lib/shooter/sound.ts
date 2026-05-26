/**
 * 사운드 — Web Audio 합성. 음원 파일 0. 모든 효과음은 OscillatorNode +
 * GainNode envelope으로 즉석 생성. maze의 lib/maze/sound.ts 패턴 차용.
 *
 * 사용 방법:
 *   const ctl = createSoundController();
 *   ctl.resume();   // user gesture 직후 (시작 버튼 등)
 *   ctl.playShoot();
 *   ctl.playHit();
 *   ctl.setMuted(true);
 *
 * AudioContext는 user gesture 후에만 시작 가능 (브라우저 정책).
 * 음소거는 localStorage 영속 — 다음 세션 유지.
 */

const STORAGE_KEY = "brennhub-shooter-muted";

export type SoundController = {
  resume(): Promise<void>;
  playShoot(): void;
  playHit(): void;
  playPickup(): void;
  playGameOver(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
};

function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // ignore
  }
}

export function createSoundController(): SoundController {
  let ctx: AudioContext | null = null;
  let muted = loadMuted();
  let masterGain: GainNode | null = null;

  const ensureCtx = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 0.35;
      masterGain.connect(ctx.destination);
    }
    return ctx;
  };

  const now = (): number => ctx?.currentTime ?? 0;

  /** 길이가 noise buffer source 만들기 — utility (반복 패턴 1회 정의). */
  const makeNoise = (
    c: AudioContext,
    durationSec: number,
    decay = true,
  ): AudioBufferSourceNode => {
    const len = Math.max(1, Math.floor(c.sampleRate * durationSec));
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const env = decay ? 1 - i / len : 1;
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    return src;
  };

  /**
   * 발사음 — 3-layer (click + body + tail). ~120ms.
   * - L1: highpass noise click (5ms) — laser energy attack
   * - L2: square body 180→50Hz (130ms) — 묵직한 발사 base
   * - L3: sine tail 720→200Hz (110ms) — 슈팅 캐릭터
   */
  const playShoot = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const mg = masterGain;
    const t = now();

    // L1: click
    const noise = makeNoise(c, 0.018);
    const noiseFilter = c.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 2200;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(mg);
    noise.start(t);

    // L2: body
    const body = c.createOscillator();
    const bodyGain = c.createGain();
    body.type = "square";
    body.frequency.setValueAtTime(180, t);
    body.frequency.exponentialRampToValueAtTime(50, t + 0.11);
    bodyGain.gain.setValueAtTime(0.001, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    body.connect(bodyGain);
    bodyGain.connect(mg);
    body.start(t);
    body.stop(t + 0.14);

    // L3: tail
    const tail = c.createOscillator();
    const tailGain = c.createGain();
    tail.type = "sine";
    tail.frequency.setValueAtTime(720, t);
    tail.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    tailGain.gain.setValueAtTime(0.001, t);
    tailGain.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    tail.connect(tailGain);
    tailGain.connect(mg);
    tail.start(t);
    tail.stop(t + 0.12);
  };

  /**
   * 적 격추음 — 3-layer punch (sub + filtered noise + mid). ~200ms.
   * - L1: sub-bass sine 80→35Hz (200ms) — 진동·무게
   * - L2: lowpass noise (180ms, cut 900Hz) — 폭발 잔향
   * - L3: square mid 220→70Hz (140ms) — punch attack
   */
  const playHit = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const mg = masterGain;
    const t = now();

    // L1: sub-bass
    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.18);
    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    sub.connect(subGain);
    subGain.connect(mg);
    sub.start(t);
    sub.stop(t + 0.21);

    // L2: filtered noise (lowpass로 두꺼운 폭발)
    const noise = makeNoise(c, 0.18);
    const noiseFilter = c.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(900, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(300, t + 0.15);
    noiseFilter.Q.value = 1.2;
    const noiseGain = c.createGain();
    noiseGain.gain.setValueAtTime(0.55, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(mg);
    noise.start(t);

    // L3: mid punch
    const mid = c.createOscillator();
    const midGain = c.createGain();
    mid.type = "square";
    mid.frequency.setValueAtTime(220, t);
    mid.frequency.exponentialRampToValueAtTime(70, t + 0.12);
    midGain.gain.setValueAtTime(0.001, t);
    midGain.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    mid.connect(midGain);
    midGain.connect(mg);
    mid.start(t);
    mid.stop(t + 0.15);
  };

  /** 픽업음 — 짧은 ascending arpeggio (C-E-G). */
  const playPickup = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const mg = masterGain; // forEach closure narrow 보존용
    const t = now();
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
    notes.forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t + i * 0.06);
      g.gain.setValueAtTime(0.001, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.12);
      osc.connect(g);
      g.connect(mg);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.13);
    });
  };

  /** 게임오버음 — 낮은 descending tone. */
  const playGameOver = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const t = now();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(82, t + 0.6);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.65);
  };

  return {
    async resume() {
      const c = ensureCtx();
      if (c && c.state === "suspended") {
        try {
          await c.resume();
        } catch {
          // ignore
        }
      }
    },
    playShoot,
    playHit,
    playPickup,
    playGameOver,
    setMuted(next: boolean) {
      muted = next;
      saveMuted(next);
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.35;
    },
    isMuted() {
      return muted;
    },
  };
}
