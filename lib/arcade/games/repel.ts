/**
 * 04 격퇴 (Repel) — 스와이프 충격으로 적을 물리적으로 밀쳐내는 코어 디펜스.
 *
 * 원본(_import/batch11.html "04 격퇴 (Repel)" IIFE)을 TS로 옮김.
 * 로직·수치·색·파티클 전부 원본 유지. 캔버스 텍스트만 영어로 교체.
 * 등록은 파일 하단 Engine.defineGame('repel', api, 0.7) 한 줄 — 엔진 수정 0.
 */
import {
  Engine,
  TAU,
  clamp,
  rand,
  randi,
  dist,
  blip,
  ctext,
  rrect,
  overlay,
  type GameApi,
} from "../engine";

type Core = { x: number; y: number; r: number; hp: number };
type Enemy = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  mhp: number;
  hv: boolean;
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string };
type TrailPoint = { x: number; y: number; life: number };
type Phase = "ready" | "play" | "over";

type RepelState = {
  W: number;
  H: number;
  phase: Phase;
  core: Core;
  en: Enemy[];
  parts: Particle[];
  trail: TrailPoint[];
  _px: number;
  _py: number;
  kills: number;
  swKills: number;
  bestSw: number;
  wave: number;
  waveT: number;
  spawnT: number;
  spawnGap: number;
  espd: number;
};

const AC = "#f59e0b";
const MARGIN = 20;

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. 값은 원본 그대로 (밸런스 변경 X).
 */
const TUNE = {
  coreHP: 100, // 코어 체력
  waveInterval: 10, // 웨이브 간격 s
  spawnGapStart: 0.8, // 초기 스폰 간격 s
  spawnGapFloor: 0.3, // 스폰 간격 하한
  spawnGapDecay: 0.04, // 웨이브당 간격 감소
  doubleSpawnFromWave: 3, // 더블 스폰 시작 웨이브 (원본 wave>2)
  enemySpeedBase: 20, // 코어로 끌리는 기본 가속
  enemySpeedWaveRamp: 3, // 웨이브당 가속 가산
  enemyHp: 3, // 일반 적 체력
  enemyHpHeavy: 6, // 중량 적 체력
  heavyChanceBase: 0.18, // 중량 적 등장 기본 확률
  heavyChanceWaveRamp: 0.015, // 웨이브당 중량 확률 가산
  contactDamage: 6, // 일반 적 코어 접촉 피해
  contactDamageHeavy: 10, // 중량 적 코어 접촉 피해
  spikeDamage: 22, // 가시벽 초당 피해
};

const S = {} as RepelState;

function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H / 2, r: 16, hp: TUNE.coreHP };
  S.en = [];
  S.parts = [];
  S.trail = [];
  S._px = 0;
  S._py = 0;
  S.kills = 0;
  S.swKills = 0;
  S.bestSw = S.bestSw || 0;
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
function burst(x: number, y: number, col: string, k?: number, sp?: number): void {
  k = k || 6;
  sp = sp || 190;
  for (let i = 0; i < k; i++) {
    const a = rand(0, TAU);
    S.parts.push({
      x,
      y,
      vx: Math.cos(a) * rand(40, sp),
      vy: Math.sin(a) * rand(40, sp),
      life: rand(0.22, 0.5),
      col,
    });
  }
}
function pointSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax,
    dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}
function spawnEnemy(): void {
  const W = S.W,
    H = S.H;
  const side = randi(0, 3);
  let x: number, y: number;
  if (side === 0) {
    x = rand(MARGIN + 10, W - MARGIN - 10);
    y = MARGIN + 12;
  } else if (side === 1) {
    x = W - MARGIN - 12;
    y = rand(MARGIN + 10, H - MARGIN - 10);
  } else if (side === 2) {
    x = rand(MARGIN + 10, W - MARGIN - 10);
    y = H - MARGIN - 12;
  } else {
    x = MARGIN + 12;
    y = rand(MARGIN + 10, H - MARGIN - 10);
  }
  const hv = Math.random() < TUNE.heavyChanceBase + S.wave * TUNE.heavyChanceWaveRamp;
  S.en.push({
    x,
    y,
    vx: 0,
    vy: 0,
    r: hv ? 15 : 11,
    hp: hv ? TUNE.enemyHpHeavy : TUNE.enemyHp,
    mhp: hv ? TUNE.enemyHpHeavy : TUNE.enemyHp,
    hv,
  });
}
function swipe(ax: number, ay: number, bx: number, by: number): void {
  const dx = bx - ax,
    dy = by - ay;
  const mag = Math.hypot(dx, dy);
  if (mag < 2) return;
  const ux = dx / mag,
    uy = dy / mag;
  const strength = clamp(mag, 0, 60) * 8.5;
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    if (pointSeg(e.x, e.y, ax, ay, bx, by) < 46 + e.r) {
      const k = strength * (e.hv ? 0.5 : 1);
      e.vx += ux * k;
      e.vy += uy * k;
    }
  }
}
function update(dt: number): void {
  if (S.phase !== "play") return;
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
    if (S.wave >= TUNE.doubleSpawnFromWave) spawnEnemy();
  }
  for (const t of S.trail) t.life -= dt;
  S.trail = S.trail.filter((t) => t.life > 0);
  const W = S.W,
    H = S.H;
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    const a = Math.atan2(S.core.y - e.y, S.core.x - e.x);
    e.vx += Math.cos(a) * S.espd * dt;
    e.vy += Math.sin(a) * S.espd * dt;
    e.vx *= 0.93;
    e.vy *= 0.93;
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > 620) {
      e.vx *= 620 / sp;
      e.vy *= 620 / sp;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    // knockoff — 장외로 밀리면 처치
    if (e.x < -e.r * 0.6 || e.x > W + e.r * 0.6 || e.y < -e.r * 0.6 || e.y > H + e.r * 0.6) {
      e.hp = 0;
      S.kills++;
      S.swKills++;
      burst(clamp(e.x, 0, W), clamp(e.y, 0, H), AC, 8, 260);
      blip(300, 0.08, "triangle", 0.04);
      continue;
    }
    // spike border — 가시벽 접촉 피해
    if (e.x < MARGIN || e.x > W - MARGIN || e.y < MARGIN || e.y > H - MARGIN) {
      e.hp -= TUNE.spikeDamage * dt;
      if (Math.random() < 0.25) burst(e.x, e.y, "#f87171", 2);
      if (e.hp <= 0) {
        S.kills++;
        S.swKills++;
        burst(e.x, e.y, "#fca5a5", 6);
        continue;
      }
    }
    if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= e.hv ? TUNE.contactDamageHeavy : TUNE.contactDamage;
      burst(e.x, e.y, "#fff", 6);
      blip(90, 0.12, "sawtooth", 0.045);
    }
  }
  // enemy-enemy collisions
  for (let i = 0; i < S.en.length; i++) {
    const a = S.en[i];
    if (a.hp <= 0) continue;
    for (let j = i + 1; j < S.en.length; j++) {
      const b = S.en[j];
      if (b.hp <= 0) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      const rr = a.r + b.r;
      if (d < rr && d > 0) {
        const nx = (b.x - a.x) / d,
          ny = (b.y - a.y) / d;
        const ov = (rr - d) / 2;
        a.x -= nx * ov;
        a.y -= ny * ov;
        b.x += nx * ov;
        b.y += ny * ov;
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const rs = Math.hypot(a.vx - b.vx, a.vy - b.vy);
        if (rs > 130) {
          const dmg = rs * 0.02;
          a.hp -= dmg;
          b.hp -= dmg;
          burst((a.x + b.x) / 2, (a.y + b.y) / 2, "#fff", 3);
          if (a.hp <= 0) {
            S.kills++;
            S.swKills++;
          }
          if (b.hp <= 0) {
            S.kills++;
            S.swKills++;
          }
        }
        if (rv < 0) {
          a.vx += nx * rv;
          a.vy += ny * rv;
          b.vx -= nx * rv;
          b.vy -= ny * rv;
        }
      }
    }
  }
  S.en = S.en.filter((e) => e.hp > 0);
  for (const p of S.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  S.parts = S.parts.filter((p) => p.life > 0);
  if (S.core.hp <= 0) {
    S.core.hp = 0;
    S.bestSw = Math.max(S.bestSw, S.swKills);
    S.phase = "over";
  }
}
function render(ctx: CanvasRenderingContext2D): void {
  const W = S.W,
    H = S.H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0b0a07";
  ctx.fillRect(0, 0, W, H);
  // spike border band
  ctx.fillStyle = "rgba(239,68,68,.1)";
  ctx.fillRect(0, 0, W, MARGIN);
  ctx.fillRect(0, H - MARGIN, W, MARGIN);
  ctx.fillRect(0, 0, MARGIN, H);
  ctx.fillRect(W - MARGIN, 0, MARGIN, H);
  ctx.strokeStyle = "rgba(248,113,113,.4)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 4]);
  ctx.strokeRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(248,113,113,.5)";
  for (let x = MARGIN; x < W - MARGIN; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, MARGIN);
    ctx.lineTo(x + 9, MARGIN - 7);
    ctx.lineTo(x + 18, MARGIN);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, H - MARGIN);
    ctx.lineTo(x + 9, H - MARGIN + 7);
    ctx.lineTo(x + 18, H - MARGIN);
    ctx.closePath();
    ctx.fill();
  }
  // swipe trail
  if (S.trail.length > 1) {
    for (let i = 1; i < S.trail.length; i++) {
      const a = S.trail[i - 1],
        b = S.trail[i];
      ctx.strokeStyle = "rgba(245,158,11," + clamp(b.life * 2.5, 0, 0.9) + ")";
      ctx.lineWidth = 5 * clamp(b.life * 2, 0, 1);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  for (const e of S.en) {
    const sp = Math.hypot(e.vx, e.vy);
    ctx.fillStyle = e.hv ? "#fbbf24" : "#ff5e7e";
    if (sp > 200) {
      ctx.save();
      ctx.shadowColor = AC;
      ctx.shadowBlur = 10;
    }
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.fill();
    if (sp > 200) ctx.restore();
    if (e.mhp > 3) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3);
      ctx.fillStyle = e.hv ? "#fde68a" : "#ffd0d8";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
    }
  }
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 16;
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.beginPath();
  ctx.arc(S.core.x, S.core.y, S.core.r, 0, TAU);
  ctx.fill();
  ctx.restore();
  for (const p of S.parts) {
    ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  ctext(ctx, "WAVE " + S.wave, 12, MARGIN + 14, 15, AC, 800, "left");
  ctext(
    ctx,
    "MAX CHAIN " + S.bestSw + " · KILLS " + S.kills,
    W - 12,
    MARGIN + 14,
    13,
    "#cdd5ea",
    700,
    "right",
  );
  ctext(ctx, "Swipe to push enemies away", W / 2, MARGIN + 14, 11.5, "rgba(245,158,11,.6)", 600);
  rrect(ctx, MARGIN, H - MARGIN - 9, W - MARGIN * 2, 5, 2);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fill();
  rrect(
    ctx,
    MARGIN,
    H - MARGIN - 9,
    (W - MARGIN * 2) * clamp(S.core.hp / TUNE.coreHP, 0, 1),
    5,
    2,
  );
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.fill();
  if (S.phase === "ready") {
    overlay(ctx, W, H, 0.78);
    ctext(ctx, "REPEL", W / 2, H / 2 - 58, 30, AC, 800);
    ctext(
      ctx,
      "Swipe to physically shove the swarming enemies back",
      W / 2,
      H / 2 - 18,
      12,
      "#aeb6cc",
      600,
    );
    ctext(
      ctx,
      "Collide them · push into the SPIKES · knock them OUT to chain kills",
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
      "MAX CHAIN " + S.bestSw + " · KILLS " + S.kills,
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
    if (S.swKills) S.bestSw = Math.max(S.bestSw, S.swKills);
    S.swKills = 0;
    return;
  }
  S._px = x;
  S._py = y;
  S.trail.push({ x, y, life: 0.4 });
}
function onMove(x: number, y: number): void {
  if (S.phase !== "play") return;
  swipe(S._px, S._py, x, y);
  S.trail.push({ x, y, life: 0.4 });
  if (S.trail.length > 14) S.trail.shift();
  S._px = x;
  S._py = y;
}
function onUp(): void {
  if (S.phase === "play") {
    S.bestSw = Math.max(S.bestSw, S.swKills);
    S.swKills = 0;
  }
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
  getResult: () => ({ over: S.phase === "over", score: S.kills }),
  wantsMove: false,
};
Engine.defineGame("repel", api, 0.7);
