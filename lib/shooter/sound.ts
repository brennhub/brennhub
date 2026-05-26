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

  /** 발사음 — 짧은 sawtooth + 빠른 high→low pitch sweep. ~80ms. */
  const playShoot = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const t = now();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.08);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  };

  /** 적 격추음 — white noise burst + low pitch hit. ~100ms. */
  const playHit = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const t = now();
    // noise burst (BufferSource)
    const bufferSize = Math.floor(c.sampleRate * 0.08);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      // 시간이 지날수록 amplitude 감소
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    noise.connect(ng);
    ng.connect(masterGain);
    noise.start(t);
    // 베이스 thud
    const osc = c.createOscillator();
    const og = c.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.09);
    og.gain.setValueAtTime(0.001, t);
    og.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(og);
    og.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.11);
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
