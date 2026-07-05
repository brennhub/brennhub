/**
 * 06 특이점 (Singularity) — 블랙홀 놓기·슬링샷 코어 디펜스.
 *
 * 원본(_import/batch11.html "06 특이점 v3 (Singularity)" IIFE)을 TS로 옮김.
 * 로직·수치·색·파티클 전부 원본 유지. 캔버스 텍스트만 영어로 교체.
 * 등록은 파일 하단 Engine.defineGame("sing", api, 0.66) 한 줄 — 엔진 수정 0.
 */
import {
  Engine,
  TAU,
  clamp,
  rand,
  dist,
  blip,
  ctext,
  rrect,
  overlay,
  type GameApi,
} from "../engine";

type Phase = "ready" | "play" | "over";
type Mode = "none" | "sling" | "place";
type EnemyType = "light" | "heavy" | "volatile";

type Core = { x: number; y: number; r: number; hp: number };
type BlackHole = { x: number; y: number; mass: number };
type Enemy = { x: number; y: number; r: number; hp: number; mhp: number; type: EnemyType };
type Grenade = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  blast: number;
  dmg: number;
  fren: number;
  dead?: boolean;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string };

type SingState = {
  W: number;
  H: number;
  phase: Phase;
  core: Core;
  bh: BlackHole;
  mode: Mode;
  _sx: number;
  _sy: number;
  _cx: number;
  _cy: number;
  dragMoved: number;
  en: Enemy[];
  gren: Grenade[];
  parts: Particle[];
  frenzy: number;
  frenT: number;
  bestFren: number;
  shotKills: number;
  bestShot: number;
  kills: number;
  wave: number;
  waveT: number;
  spawnT: number;
  spawnGap: number;
  espd: number;
};

const AC = "#a78bfa";
const MBASE = 6,
  MCAP = 42,
  THRESH = 16;

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. 값은 원본 그대로 (밸런스 조정은 플레이테스트 후).
 */
const TUNE = {
  coreHP: 100, // 코어 체력
  waveInterval: 10, // 웨이브 간격 s
  spawnGapStart: 0.85, // 초기 스폰 간격 s
  spawnGapFloor: 0.32, // 스폰 간격 하한
  spawnGapDecay: 0.04, // 웨이브당 간격 감소
  doubleSpawnFromWave: 2, // 이 웨이브 초과 시 더블 스폰 (원본 wave>2)
  enemySpeedBase: 22, // 적 기본 이동 속도
  enemySpeedWaveRamp: 3, // 웨이브당 속도 가산
  enemyHpHeavy: 7, // heavy 적 HP
  enemyHpVolatile: 3, // volatile 적 HP
  enemyHpLight: 3, // light 적 HP
  contactDamage: 6, // 코어 접촉 피해
  contactDamageHeavy: 9, // heavy 접촉 피해
  absorbDps: 14, // 블랙홀 흡수 피해/s
  volatileChainDamage: 5, // volatile 폭발 연쇄 피해
};

const S = {} as SingState;

function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H / 2, r: 15, hp: TUNE.coreHP };
  S.bh = { x: W / 2, y: H / 2, mass: MBASE };
  S.mode = "none";
  S._sx = 0;
  S._sy = 0;
  S._cx = 0;
  S._cy = 0;
  S.dragMoved = 0;
  S.en = [];
  S.gren = [];
  S.parts = [];
  S.frenzy = 0;
  S.frenT = 0;
  S.bestFren = S.bestFren || 0;
  S.shotKills = 0;
  S.bestShot = S.bestShot || 0;
  S.kills = 0;
  S.wave = 1;
  S.waveT = 0;
  S.spawnT = 0;
  S.spawnGap = TUNE.spawnGapStart;
  S.espd = TUNE.enemySpeedBase;
}
function onResize(W: number, H: number): void {
  S.W = W;
  S.H = H;
  if (S.core) {
    S.core.x = W / 2;
    S.core.y = H / 2;
  }
}
function bhR(): number {
  return 13 + S.bh.mass * 0.5;
}
function burst(x: number, y: number, col: string, k?: number, sp?: number): void {
  k = k || 7;
  sp = sp || 190;
  for (let i = 0; i < k; i++) {
    const a = rand(0, TAU);
    S.parts.push({
      x,
      y,
      vx: Math.cos(a) * rand(40, sp),
      vy: Math.sin(a) * rand(40, sp),
      life: rand(0.22, 0.55),
      col,
    });
  }
}
function spawnEnemy(): void {
  const a = rand(0, TAU);
  const R = Math.max(S.W, S.H) * 0.6;
  const rr = Math.random();
  let type: EnemyType = "light";
  if (rr < 0.2 + S.wave * 0.01) type = "heavy";
  else if (rr < 0.38) type = "volatile";
  const hp =
    type === "heavy"
      ? TUNE.enemyHpHeavy
      : type === "volatile"
        ? TUNE.enemyHpVolatile
        : TUNE.enemyHpLight;
  S.en.push({
    x: S.core.x + Math.cos(a) * R,
    y: S.core.y + Math.sin(a) * R,
    r: type === "heavy" ? 14 : 10,
    hp,
    mhp: hp,
    type,
  });
}
function addFren(): void {
  S.frenzy = Math.min(4, S.frenzy + 1);
  S.frenT = 1.4;
  S.bestFren = Math.max(S.bestFren, S.frenzy);
}
function killEnemy(e: Enemy, fromGren: boolean): void {
  e.hp = 0;
  if (e.type === "volatile") {
    burst(e.x, e.y, "#f0abfc", 12, 260);
    for (const o of S.en) {
      if (o.hp > 0 && o !== e && dist(o.x, o.y, e.x, e.y) < 70) {
        o.hp -= TUNE.volatileChainDamage;
        if (o.hp <= 0) {
          S.kills++;
          if (fromGren) S.shotKills++;
        }
      }
    }
    blip(420, 0.12, "sawtooth", 0.04);
  }
  S.kills++;
  if (fromGren) S.shotKills++;
}
function fire(): void {
  const pull = Math.hypot(S._cx - S.bh.x, S._cy - S.bh.y);
  if (pull < 8) return;
  const f = clamp(pull / (Math.max(S.W, S.H) * 0.4), 0.15, 1);
  const ang = Math.atan2(S.bh.y - S._cy, S.bh.x - S._cx);
  const sp = 300 + f * 560;
  const blast = (46 + S.bh.mass * 3) * (1 + S.frenzy * 0.4);
  S.gren.push({
    x: S.bh.x,
    y: S.bh.y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    life: 1.5,
    blast,
    dmg: 5 + S.bh.mass * 0.4,
    fren: S.frenzy,
  });
  S.shotKills = 0;
  S.bh.mass = MBASE;
  blip(200, 0.18, "sine", 0.05);
}
function detonate(g: Grenade): void {
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    if (dist(e.x, e.y, g.x, g.y) < g.blast) {
      e.hp -= g.dmg;
      if (e.hp <= 0) killEnemy(e, true);
    }
  }
  burst(g.x, g.y, "#c4b5fd", 18, 300);
  blip(150, 0.22, "sawtooth", 0.05);
  S.bestShot = Math.max(S.bestShot, S.shotKills);
}
function update(dt: number): void {
  if (S.phase !== "play") return;
  S.frenT = Math.max(0, S.frenT - dt);
  if (S.frenT <= 0) S.frenzy = Math.max(0, S.frenzy - dt * 0.8);
  S.waveT += dt;
  if (S.waveT > TUNE.waveInterval) {
    S.waveT = 0;
    S.wave++;
    S.spawnGap = Math.max(TUNE.spawnGapFloor, TUNE.spawnGapStart - S.wave * TUNE.spawnGapDecay);
    S.espd = TUNE.enemySpeedBase + S.wave * TUNE.enemySpeedWaveRamp;
    blip(560, 0.14, "sine", 0.045);
  }
  S.spawnT += dt;
  if (S.spawnT >= S.spawnGap) {
    S.spawnT = 0;
    spawnEnemy();
    if (S.wave > TUNE.doubleSpawnFromWave) spawnEnemy();
  }
  const bh = S.bh,
    br = bhR();
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    const a = Math.atan2(S.core.y - e.y, S.core.x - e.x);
    e.x += Math.cos(a) * S.espd * dt;
    e.y += Math.sin(a) * S.espd * dt;
    const d = dist(e.x, e.y, bh.x, bh.y) || 1;
    if (d < 260) {
      const pull = (e.type === "heavy" ? 0.4 : 1) * (2600 / (d + 40));
      const pa = Math.atan2(bh.y - e.y, bh.x - e.x);
      e.x += Math.cos(pa) * pull * dt;
      e.y += Math.sin(pa) * pull * dt;
    }
    if (d < br + e.r * 0.5) {
      e.hp -= TUNE.absorbDps * dt;
      if (e.hp <= 0) {
        bh.mass = Math.min(MCAP, bh.mass + (e.type === "heavy" ? 2 : 1));
        addFren();
        burst(e.x, e.y, AC, 6);
        killEnemy(e, false);
        continue;
      }
    }
    if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= e.type === "heavy" ? TUNE.contactDamageHeavy : TUNE.contactDamage;
      burst(e.x, e.y, "#fff", 6);
      blip(90, 0.12, "sawtooth", 0.045);
    }
  }
  for (const g of S.gren) {
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= 0.965;
    g.vy *= 0.965;
    g.life -= dt;
    for (const e of S.en) {
      if (e.hp <= 0) continue;
      const d = dist(e.x, e.y, g.x, g.y) || 1;
      if (d < g.blast * 1.4) {
        const pa = Math.atan2(g.y - e.y, g.x - e.x);
        const pull = 2200 / (d + 40);
        e.x += Math.cos(pa) * pull * dt;
        e.y += Math.sin(pa) * pull * dt;
      }
    }
    if (g.life <= 0) {
      detonate(g);
      g.dead = true;
    }
  }
  S.gren = S.gren.filter((g) => !g.dead);
  S.en = S.en.filter((e) => e.hp > 0);
  for (const p of S.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  S.parts = S.parts.filter((p) => p.life > 0);
  if (S.core.hp <= 0) {
    S.core.hp = 0;
    S.phase = "over";
  }
}
function render(ctx: CanvasRenderingContext2D): void {
  const W = S.W,
    H = S.H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#080611";
  ctx.fillRect(0, 0, W, H);
  const bh = S.bh,
    br = bhR();
  const g = ctx.createRadialGradient(bh.x, bh.y, br * 0.4, bh.x, bh.y, 260);
  g.addColorStop(0, "rgba(167,139,250,.16)");
  g.addColorStop(1, "rgba(167,139,250,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, 260, 0, TAU);
  ctx.fill();
  // slingshot preview
  if (S.mode === "sling" && S.dragMoved >= THRESH) {
    const pull = Math.hypot(S._cx - bh.x, S._cy - bh.y);
    const f = clamp(pull / (Math.max(W, H) * 0.4), 0.15, 1);
    const ang = Math.atan2(bh.y - S._cy, bh.x - S._cx);
    ctx.strokeStyle = "rgba(196,181,253,.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(S._cx, S._cy);
    ctx.lineTo(bh.x, bh.y);
    ctx.stroke();
    ctx.setLineDash([6, 7]);
    ctx.strokeStyle = "rgba(196,181,253,.85)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bh.x, bh.y);
    ctx.lineTo(bh.x + Math.cos(ang) * (60 + f * 260), bh.y + Math.sin(ang) * (60 + f * 260));
    ctx.stroke();
    ctx.setLineDash([]);
    ctext(ctx, "POWER " + Math.round(f * 100) + "%", bh.x, bh.y - br - 14, 12, AC, 800);
  }
  for (const e of S.en) {
    const col = e.type === "heavy" ? "#f0abfc" : e.type === "volatile" ? "#fbbf24" : "#c4b5fd";
    ctx.fillStyle = col;
    if (e.type === "volatile") {
      ctx.save();
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.fill();
    if (e.type === "volatile") ctx.restore();
    if (e.mhp > 3) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3);
      ctx.fillStyle = "#ddd6fe";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
    }
  }
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 14;
  ctx.fillStyle = S.core.hp > 30 ? "#ddd6fe" : "#ff5e7e";
  ctx.beginPath();
  ctx.arc(S.core.x, S.core.y, S.core.r, 0, TAU);
  ctx.fill();
  ctx.restore();
  // black hole
  ctx.fillStyle = "#05030a";
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, br, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = AC;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, br, 0, TAU);
  ctx.stroke();
  const t = performance.now() / 600;
  for (let i = 0; i < 3; i++) {
    const rr = br + 6 + i * 5;
    ctx.strokeStyle = "rgba(167,139,250," + (0.3 - i * 0.08) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, rr, t + i * 2, t + i * 2 + 2.2);
    ctx.stroke();
  }
  for (const gr of S.gren) {
    ctx.save();
    ctx.shadowColor = "#c4b5fd";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#0a0716";
    ctx.beginPath();
    ctx.arc(gr.x, gr.y, 8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#c4b5fd";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = "rgba(196,181,253,.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(gr.x, gr.y, gr.blast, 0, TAU);
    ctx.stroke();
  }
  for (const p of S.parts) {
    ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  // frenzy meter
  if (S.frenzy > 0.05) {
    ctext(ctx, "FRENZY ×" + (1 + S.frenzy * 0.4).toFixed(1), W / 2, H - 30, 16, AC, 800);
    rrect(ctx, W / 2 - 50, H - 20, 100, 5, 2);
    ctx.fillStyle = "rgba(255,255,255,.1)";
    ctx.fill();
    rrect(ctx, W / 2 - 50, H - 20, 100 * clamp(S.frenzy / 4, 0, 1), 5, 2);
    ctx.fillStyle = AC;
    ctx.fill();
  }
  ctext(ctx, "WAVE " + S.wave, 12, 22, 15, AC, 800, "left");
  ctext(
    ctx,
    "MASS " + Math.round(S.bh.mass) + " · KILLS " + S.kills,
    W - 12,
    22,
    13,
    "#cdd5ea",
    700,
    "right",
  );
  ctext(
    ctx,
    "Tap to place · drag from the black hole to slingshot",
    W / 2,
    22,
    11.5,
    "rgba(167,139,250,.6)",
    600,
  );
  rrect(ctx, 12, H - 46, W - 24, 5, 2);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fill();
  rrect(ctx, 12, H - 46, (W - 24) * clamp(S.core.hp / TUNE.coreHP, 0, 1), 5, 2);
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.fill();
  if (S.phase === "ready") {
    overlay(ctx, W, H, 0.78);
    ctext(ctx, "SINGULARITY", W / 2, H / 2 - 58, 28, AC, 800);
    ctext(
      ctx,
      "Tap to place the black hole — it devours enemies and grows",
      W / 2,
      H / 2 - 18,
      12,
      "#aeb6cc",
      600,
    );
    ctext(
      ctx,
      "Drag from the black hole and release to fire a gravity grenade",
      W / 2,
      H / 2 + 4,
      11.5,
      "#aeb6cc",
      600,
    );
    ctext(ctx, "Tap to start", W / 2, H / 2 + 44, 13, AC, 700);
  } else if (S.phase === "over") {
    overlay(ctx, W, H, 0.72);
    ctext(ctx, "CORE LOST", W / 2, H / 2 - 22, 26, "#ff5e7e", 800);
    ctext(
      ctx,
      "KILLS " + S.kills + " · MAX FRENZY ×" + (1 + S.bestFren * 0.4).toFixed(1),
      W / 2,
      H / 2 + 10,
      14,
      "#fff",
      700,
    );
    ctext(ctx, "Tap to restart", W / 2, H / 2 + 36, 13, "#aeb6cc", 600);
  }
}
function onDown(x: number, y: number): void {
  if (S.phase !== "play") {
    if (S.phase !== "ready") reset(S.W, S.H);
    S.phase = "play";
    return;
  }
  S._sx = x;
  S._sy = y;
  S._cx = x;
  S._cy = y;
  S.dragMoved = 0;
  S.mode = dist(x, y, S.bh.x, S.bh.y) < bhR() + 46 ? "sling" : "place";
}
function onMove(x: number, y: number): void {
  if (S.phase !== "play") return;
  S.dragMoved += dist(x, y, S._cx, S._cy);
  S._cx = x;
  S._cy = y;
}
function onUp(x: number, y: number): void {
  if (S.phase !== "play") return;
  if (S.mode === "sling") {
    if (S.dragMoved >= THRESH) fire();
  } else if (S.mode === "place") {
    S.bh.x = clamp(x, 20, S.W - 20);
    S.bh.y = clamp(y, 20, S.H - 20);
    blip(360, 0.08, "sine", 0.04);
  }
  S.mode = "none";
}
function onKey(): boolean {
  return false;
}

const api: GameApi = {
  reset,
  update,
  render,
  onDown,
  onMove,
  onUp,
  onKey,
  onResize,
  wantsMove: true,
};
Engine.defineGame("sing", api, 0.66);
