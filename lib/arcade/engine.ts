/**
 * Arcade 공용 엔진 — 활성 게임 1개만 tick 하는 단일 canvas 루프.
 *
 * 원본(_import/batch11.html <script> "Engine" IIFE)을 "단일 공용 canvas"용으로 리팩터:
 *   - 원본은 게임마다 자기 canvas(cvId)를 getElementById로 잡았지만,
 *     여기선 shell이 넘겨준 하나의 <canvas>를 attach()로 공유한다 (cvId 제거).
 *   - DPR/backing/transform은 shell의 fitCanvas가 처리 (원본 sizeGame 개념을 shell로 이관).
 *     엔진은 논리치수(W,H)만 들고, 게임은 그 좌표계로 그린다.
 *   - defineGame은 멱등(같은 id 재등록 시 덮어쓰기) — fast-refresh/재마운트 안전.
 *   - destroy()가 RAF·모든 리스너를 회수 → tool 이탈/재진입 시 누수 0.
 *
 * 게임 2~6은 이 파일을 수정하지 않고 defineGame(id, api, aspect)만 호출해 얹는다.
 */

// ===== shared helpers (원본 유지) =====
export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(a + Math.random() * (b - a + 1));
export const dist = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x1 - x2, y1 - y2);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const FONT =
  'system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans KR","Apple SD Gothic Neo",sans-serif';

let _ac: AudioContext | null = null;
let _master: GainNode | null = null; // 모든 SFX 공용 출력(마스터 게인 → 컴프레서 → destination)
export function audioInit(): void {
  if (_ac) return;
  try {
    const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
    const C = window.AudioContext || w.webkitAudioContext;
    _ac = C ? new C() : null;
    if (_ac) {
      _master = _ac.createGain();
      _master.gain.value = 0.34; // 마스터 낮게 (동시다발 대비)
      const comp = _ac.createDynamicsCompressor(); // 겹칠 때 클리핑·과대음량 방지
      _master.connect(comp);
      comp.connect(_ac.destination);
    }
  } catch {
    _ac = null;
    _master = null;
  }
}
export function blip(freq: number, dur?: number, type?: OscillatorType, vol?: number): void {
  if (!_ac || !_master) return;
  try {
    const t = _ac.currentTime,
      o = _ac.createOscillator(),
      g = _ac.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(_master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol || 0.05, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
    o.start(t);
    o.stop(t + (dur || 0.12) + 0.03);
  } catch {
    // ignore — 오디오 실패는 게임 진행에 영향 없음
  }
}

/** 절차적 톤 원샷 — freq 스위프 + 게인 엔벨로프. asset 0(웹오디오 합성). 게임 공용. */
export function tone(
  freq: number,
  opts: {
    freq2?: number;
    dur?: number;
    vol?: number;
    type?: OscillatorType;
    attack?: number;
    sweep?: "lin" | "exp";
    delay?: number;
  } = {},
): void {
  if (!_ac || !_master) return;
  try {
    const t0 = _ac.currentTime + (opts.delay || 0);
    const dur = opts.dur ?? 0.12;
    const vol = opts.vol ?? 0.3;
    const attack = opts.attack ?? 0.006;
    const o = _ac.createOscillator();
    const g = _ac.createGain();
    o.type = opts.type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (opts.freq2 != null) {
      if (opts.sweep === "exp")
        o.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freq2), t0 + dur);
      else o.frequency.linearRampToValueAtTime(opts.freq2, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(_master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  } catch {
    // ignore
  }
}

/** 절차적 노이즈 원샷 — 필터 + 게인 엔벨로프 (crunch/whoosh/thud 등). 게임 공용. */
export function noiseBurst(
  opts: {
    dur?: number;
    vol?: number;
    filter?: BiquadFilterType;
    freq?: number;
    freq2?: number;
  } = {},
): void {
  if (!_ac || !_master) return;
  try {
    const t0 = _ac.currentTime;
    const dur = opts.dur ?? 0.15;
    const vol = opts.vol ?? 0.25;
    const len = Math.max(1, Math.floor(_ac.sampleRate * dur));
    const buf = _ac.createBuffer(1, len, _ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = _ac.createBufferSource();
    src.buffer = buf;
    const g = _ac.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (opts.filter) {
      const f = _ac.createBiquadFilter();
      f.type = opts.filter;
      f.frequency.setValueAtTime(opts.freq ?? 800, t0);
      if (opts.freq2 != null) f.frequency.linearRampToValueAtTime(opts.freq2, t0 + dur);
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(_master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  } catch {
    // ignore
  }
}

export function ctext(
  ctx: CanvasRenderingContext2D,
  txt: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight?: number,
  align?: CanvasTextAlign,
): void {
  ctx.fillStyle = color;
  ctx.font = (weight || 600) + " " + size + "px " + FONT;
  ctx.textAlign = align || "center";
  ctx.textBaseline = "middle";
  ctx.fillText(txt, x, y);
  ctx.textAlign = "left";
}
export function rrect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function overlay(ctx: CanvasRenderingContext2D, W: number, H: number, a: number): void {
  ctx.fillStyle = "rgba(7,9,18," + a + ")";
  ctx.fillRect(0, 0, W, H);
}

// ===== game contract =====
export type GameApi = {
  reset(W: number, H: number): void;
  update(dt: number, W: number, H: number): void;
  render(ctx: CanvasRenderingContext2D, W: number, H: number): void;
  onDown?(x: number, y: number, button?: number): void;
  onMove?(x: number, y: number): void;
  onUp?(x: number, y: number): void;
  onKey?(key: string, ev?: KeyboardEvent): boolean | void;
  onResize?(W: number, H: number): void;
  wantsMove?: boolean;
};

type Registered = { id: string; api: GameApi; aspect: number; started: boolean };

/** 활성 게임 1개만 tick 하는 단일 canvas 엔진. 게임/shell 모두 이 인스턴스를 공유. */
class ArcadeEngine {
  private reg: Record<string, Registered> = {};
  private active: string | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private W = 640;
  private H = 400;
  private raf: number | null = null;
  private last = 0;
  private down = false;

  /** 게임 등록. 같은 id면 덮어쓰기(멱등). 게임 2~6은 이것만 호출. */
  defineGame(id: string, api: GameApi, aspect: number): void {
    this.reg[id] = { id, api, aspect: aspect || 0.62, started: false };
  }

  getAspect(id: string): number {
    return this.reg[id]?.aspect ?? 0.62;
  }
  activeAspect(): number {
    return this.active ? this.getAspect(this.active) : 0.62;
  }

  /** shell이 canvas 마운트 후 1회 호출 — ctx 취득 + 입력 리스너 1세트 부착. */
  attach(canvas: HTMLCanvasElement): void {
    if (this.canvas) this.detach();
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    canvas.addEventListener("pointerdown", this.onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", this.onPointerMove, { passive: false });
    canvas.addEventListener("contextmenu", this.onContextMenu);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("keydown", this.onKeyDown);
  }

  /** 논리치수 갱신 + 활성 게임에 onResize 통지. DPR/backing은 shell fitCanvas 담당. */
  resize(W: number, H: number): void {
    this.W = W;
    this.H = H;
    const g = this.activeGame();
    if (g) g.api.onResize?.(W, H);
  }

  /** 활성 게임 지정. 최초 활성화 시 api.reset(W,H) 1회. */
  setActive(id: string): void {
    this.active = id;
    const g = this.reg[id];
    if (!g) return;
    if (!g.started) {
      g.api.reset(this.W, this.H);
      g.started = true;
    }
  }

  start(): void {
    if (this.raf != null) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** 언마운트 cleanup에서 호출 — RAF·리스너 회수 + started 리셋(재진입 시 fresh). */
  destroy(): void {
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.detach();
    for (const id in this.reg) this.reg[id].started = false;
    this.active = null;
  }

  private activeGame(): Registered | null {
    return this.active ? (this.reg[this.active] ?? null) : null;
  }

  private detach(): void {
    const cv = this.canvas;
    if (cv) {
      cv.removeEventListener("pointerdown", this.onPointerDown);
      cv.removeEventListener("pointermove", this.onPointerMove);
      cv.removeEventListener("contextmenu", this.onContextMenu);
    }
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("keydown", this.onKeyDown);
    this.canvas = null;
    this.ctx = null;
    this.down = false;
  }

  /** clientX/Y → 논리좌표 (canvas rect + 논리 W/H 스케일). 원본 getPtr. */
  private getPtr(e: PointerEvent): { x: number; y: number } {
    const cv = this.canvas;
    if (!cv) return { x: 0, y: 0 };
    const r = cv.getBoundingClientRect();
    const sx = r.width ? this.W / r.width : 1;
    const sy = r.height ? this.H / r.height : 1;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  }

  private tick = (ts: number): void => {
    const dt = Math.min(0.05, (ts - this.last) / 1000) || 0.016;
    this.last = ts;
    const g = this.activeGame();
    if (g && this.ctx) {
      try {
        g.api.update(dt, this.W, this.H);
        g.api.render(this.ctx, this.W, this.H);
      } catch (err) {
        console.error("[arcade]", g.id, err);
      }
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private onPointerDown = (ev: PointerEvent): void => {
    ev.preventDefault();
    audioInit();
    const g = this.activeGame();
    if (!g) return;
    this.down = true;
    const p = this.getPtr(ev);
    g.api.onDown?.(p.x, p.y, ev.button);
  };

  private onPointerMove = (ev: PointerEvent): void => {
    const g = this.activeGame();
    if (!g) return;
    if (g.api.wantsMove || this.down) {
      const p = this.getPtr(ev);
      g.api.onMove?.(p.x, p.y);
    }
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if (!this.down) return;
    this.down = false;
    const g = this.activeGame();
    if (!g) return;
    const p = this.getPtr(ev);
    g.api.onUp?.(p.x, p.y);
  };

  private onKeyDown = (ev: KeyboardEvent): void => {
    const g = this.activeGame();
    if (!g || !g.api.onKey) return;
    if (g.api.onKey(ev.key, ev)) ev.preventDefault();
  };

  // 우클릭 컨텍스트 메뉴 억제(캔버스 한정) — 미러 우클릭 제거 UX. 다른 게임엔 영향 없음.
  private onContextMenu = (ev: Event): void => {
    ev.preventDefault();
  };
}

/** 단일 공용 엔진 인스턴스. */
export const Engine = new ArcadeEngine();
