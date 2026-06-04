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

/**
 * 짧은 impulse response — exponential decay noise. ConvolverNode 입력용.
 * 게임 폭발/타격 잔향용 (room reverb처럼 짧고 dense).
 */
function createImpulseBuffer(c: AudioContext, durationSec: number, decay = 2.5): AudioBuffer {
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

export function createSoundController(): SoundController {
  let ctx: AudioContext | null = null;
  let muted = loadMuted();
  let masterGain: GainNode | null = null;
  let convolver: ConvolverNode | null = null;
  let reverbReturn: GainNode | null = null;

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
      masterGain.gain.value = muted ? 0 : 0.5;
      masterGain.connect(ctx.destination);

      // Reverb bus — 짧은 impulse (300ms)로 게임 공간감.
      // 각 sfx가 dry → masterGain + wet → convolver → reverbReturn → masterGain.
      convolver = ctx.createConvolver();
      convolver.buffer = createImpulseBuffer(ctx, 0.3, 2.5);
      reverbReturn = ctx.createGain();
      reverbReturn.gain.value = 0.35; // wet level
      convolver.connect(reverbReturn);
      reverbReturn.connect(masterGain);
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
   * 발사음 — 4-layer + reverb send.
   * - L1 sub thump: sine 90→40Hz (kick drum-ish 무게)
   * - L2 click: highpass(2.5kHz) noise (sharp attack)
   * - L3 body: square detuned 2 layers (-10/+10 cents) — 풍부함
   * - L4 tail: sine 680→180Hz (슈팅 캐릭터 유지)
   */
  const playShoot = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const mg = masterGain;
    const cv = convolver;
    const t = now();

    // L1 sub thump — kick feel
    const thump = c.createOscillator();
    const thumpGain = c.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(90, t);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.08);
    thumpGain.gain.setValueAtTime(0.001, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.6, t + 0.004);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    thump.connect(thumpGain);
    thumpGain.connect(mg);
    if (cv) thumpGain.connect(cv);
    thump.start(t);
    thump.stop(t + 0.11);

    // L2 click — sharp attack
    const click = makeNoise(c, 0.012);
    const clickFilter = c.createBiquadFilter();
    clickFilter.type = "highpass";
    clickFilter.frequency.value = 2500;
    const clickGain = c.createGain();
    clickGain.gain.setValueAtTime(0.4, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    click.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(mg);
    click.start(t);

    // L3 body — detuned square 2 layers
    for (const detune of [-10, 10]) {
      const body = c.createOscillator();
      const bodyGain = c.createGain();
      body.type = "square";
      body.frequency.setValueAtTime(220, t);
      body.frequency.exponentialRampToValueAtTime(70, t + 0.1);
      body.detune.value = detune;
      bodyGain.gain.setValueAtTime(0.001, t);
      bodyGain.gain.exponentialRampToValueAtTime(0.2, t + 0.006);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      body.connect(bodyGain);
      bodyGain.connect(mg);
      body.start(t);
      body.stop(t + 0.13);
    }

    // L4 tail
    const tail = c.createOscillator();
    const tailGain = c.createGain();
    tail.type = "sine";
    tail.frequency.setValueAtTime(680, t);
    tail.frequency.exponentialRampToValueAtTime(180, t + 0.1);
    tailGain.gain.setValueAtTime(0.001, t);
    tailGain.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
    tailGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    tail.connect(tailGain);
    tailGain.connect(mg);
    tail.start(t);
    tail.stop(t + 0.12);
  };

  /**
   * 적 격추음 — 4-layer explosion + strong reverb send.
   * - L1 sub kick: sine 120→28Hz (250ms) — 폭발 무게
   * - L2 explosion noise: lowpass(1200→200Hz) (300ms) — 두꺼운 폭발 본체
   * - L3 crack: highpass(3.5kHz) noise burst (12ms) — sharp impact
   * - L4 mid punch: square detuned 3 layers (-15/0/+15 cents) — body
   */
  const playHit = (): void => {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !masterGain) return;
    const mg = masterGain;
    const cv = convolver;
    const t = now();

    // L1 sub kick
    const sub = c.createOscillator();
    const subGain = c.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.25);
    subGain.gain.setValueAtTime(0.001, t);
    subGain.gain.exponentialRampToValueAtTime(0.75, t + 0.005);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    sub.connect(subGain);
    subGain.connect(mg);
    if (cv) subGain.connect(cv);
    sub.start(t);
    sub.stop(t + 0.31);

    // L2 explosion noise
    const noise = makeNoise(c, 0.32);
    const nFilter = c.createBiquadFilter();
    nFilter.type = "lowpass";
    nFilter.frequency.setValueAtTime(1200, t);
    nFilter.frequency.exponentialRampToValueAtTime(200, t + 0.28);
    nFilter.Q.value = 1.5;
    const nGain = c.createGain();
    nGain.gain.setValueAtTime(0.65, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(mg);
    if (cv) nGain.connect(cv);
    noise.start(t);

    // L3 crack — high-freq sharp click
    const crack = makeNoise(c, 0.012);
    const crackFilter = c.createBiquadFilter();
    crackFilter.type = "highpass";
    crackFilter.frequency.value = 3500;
    const crackGain = c.createGain();
    crackGain.gain.setValueAtTime(0.45, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    crack.connect(crackFilter);
    crackFilter.connect(crackGain);
    crackGain.connect(mg);
    crack.start(t);

    // L4 mid punch — detuned square 3 layers
    for (const detune of [-15, 0, 15]) {
      const mid = c.createOscillator();
      const midGain = c.createGain();
      mid.type = "square";
      mid.frequency.setValueAtTime(180, t);
      mid.frequency.exponentialRampToValueAtTime(60, t + 0.15);
      mid.detune.value = detune;
      midGain.gain.setValueAtTime(0.001, t);
      midGain.gain.exponentialRampToValueAtTime(0.2, t + 0.008);
      midGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      mid.connect(midGain);
      midGain.connect(mg);
      if (cv) midGain.connect(cv);
      mid.start(t);
      mid.stop(t + 0.19);
    }
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
      if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
  };
}
