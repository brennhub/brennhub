/**
 * 02 사슬추 (Flail) — 홀드로 가속하는 자동 회전 사슬추 + 요요 발사 코어 디펜스.
 *
 * 원본(_import/batch11.html "02 사슬추 v3 (Flail)" IIFE)을 TS로 옮김.
 * 로직·수치·색·파티클 전부 원본 유지. 캔버스 텍스트만 영어로 교체.
 * 등록은 파일 하단 Engine.defineGame('flail', api, 0.64) 한 줄 — 엔진 수정 0.
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

type Core = { x: number; y: number; r: number; hp: number };
type Flail = { th: number; om: number; rad: number };
type Enemy = { x: number; y: number; r: number; hp: number; mhp: number; hv: boolean; hitcd: number };
type Fling = {
  active: boolean;
  ang: number;
  phase: "out" | "in";
  dist: number;
  max: number;
  hit: Enemy[];
};
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string };
type TrailPoint = { x: number; y: number };
type Shock = { r: number; max: number; grow: number; hit: Enemy[] };
type Button = { x: number; y: number; w: number; h: number };
type Phase = "ready" | "play" | "over";

type FlailState = {
  W: number;
  H: number;
  phase: Phase;
  core: Core;
  baseOm: number;
  omCap: number;
  fl: Flail;
  baseR: number;
  maxR: number;
  fling: Fling;
  _down: boolean;
  dragMoved: number;
  _sx: number;
  _sy: number;
  _px: number;
  _py: number;
  lx: number;
  ly: number;
  en: Enemy[];
  parts: Particle[];
  trail: TrailPoint[];
  shocks: Shock[];
  swingHits: number;
  bestSwing: number;
  kills: number;
  wave: number;
  waveT: number;
  spawnT: number;
  spawnGap: number;
  espd: number;
  relCd: number;
  bRel: Button;
};

const AC = "#fb7185";
const FLING = 30;

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. 값은 원본과 동일 (밸런스는 플레이테스트 후 별도 조정).
 */
const TUNE = {
  coreHP: 100, // 코어 체력
  waveInterval: 10, // 웨이브 간격 s
  spawnGapStart: 0.85, // 초기 스폰 간격 s
  spawnGapFloor: 0.3, // 스폰 간격 하한
  spawnGapDecay: 0.04, // 웨이브당 간격 감소
  doubleSpawnFromWave: 3, // 더블 스폰 시작 웨이브 (원본 wave>2)
  enemySpeedBase: 22, // 적 기본 속도
  enemySpeedWaveRamp: 3.5, // 웨이브당 속도 가산
  enemyHpNormal: 3, // 일반 적 체력
  enemyHpHeavy: 8, // 중적 체력
  contactDamage: 6, // 코어 접촉 피해 (일반)
  contactDamageHeavy: 10, // 코어 접촉 피해 (중적)
  releaseCd: 1.2, // 방출 쿨다운 s
};

const S = {} as FlailState;

function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H / 2, r: 14, hp: TUNE.coreHP };
  S.baseOm = 1.7;
  S.omCap = 14;
  S.fl = { th: 0, om: 1.7, rad: 40 };
  S.baseR = 32;
  S.maxR = Math.min(W, H) * 0.42;
  S.fling = { active: false, ang: 0, phase: "out", dist: 0, max: 0, hit: [] };
  S._down = false;
  S.dragMoved = 0;
  S._sx = 0;
  S._sy = 0;
  S._px = 0;
  S._py = 0;
  S.lx = 0;
  S.ly = 0;
  S.en = [];
  S.parts = [];
  S.trail = [];
  S.shocks = [];
  S.swingHits = 0;
  S.bestSwing = S.bestSwing || 0;
  S.kills = 0;
  S.wave = 1;
  S.waveT = 0;
  S.spawnT = 0;
  S.spawnGap = TUNE.spawnGapStart;
  S.espd = TUNE.enemySpeedBase;
  S.relCd = 0;
  layoutBtns();
}
function layoutBtns(): void {
  const W = S.W,
    H = S.H;
  S.bRel = { x: W - 114, y: H - 42, w: 104, h: 30 };
}
function onResize(W: number, H: number): void {
  S.W = W;
  S.H = H;
  if (S.core) {
    S.core.x = W / 2;
    S.core.y = H / 2;
    S.maxR = Math.min(W, H) * 0.42;
    layoutBtns();
  }
}
function burst(x: number, y: number, col: string, k?: number): void {
  k = k || 7;
  for (let i = 0; i < k; i++) {
    const a = rand(0, TAU);
    S.parts.push({
      x,
      y,
      vx: Math.cos(a) * rand(50, 210),
      vy: Math.sin(a) * rand(50, 210),
      life: rand(0.25, 0.55),
      col,
    });
  }
}
function orbPos(): { x: number; y: number } {
  if (S.fling.active)
    return {
      x: S.core.x + Math.cos(S.fling.ang) * S.fling.dist,
      y: S.core.y + Math.sin(S.fling.ang) * S.fling.dist,
    };
  return {
    x: S.core.x + Math.cos(S.fl.th) * S.fl.rad,
    y: S.core.y + Math.sin(S.fl.th) * S.fl.rad,
  };
}
function inRect(x: number, y: number, r: Button): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
function spawnEnemy(): void {
  const a = rand(0, TAU);
  const R = Math.max(S.W, S.H) * 0.6;
  const hv = Math.random() < 0.2 + S.wave * 0.02;
  S.en.push({
    x: S.core.x + Math.cos(a) * R,
    y: S.core.y + Math.sin(a) * R,
    r: hv ? 14 : 10,
    hp: hv ? TUNE.enemyHpHeavy : TUNE.enemyHpNormal,
    mhp: hv ? TUNE.enemyHpHeavy : TUNE.enemyHpNormal,
    hv,
    hitcd: 0,
  });
}
function startFling(ang: number): void {
  S.fling.active = true;
  S.fling.ang = ang;
  S.fling.phase = "out";
  S.fling.dist = S.fl.rad;
  S.fling.max = Math.min(S.W, S.H) * 0.5;
  S.fling.hit = [];
  blip(300, 0.1, "sawtooth", 0.04);
}
function release(): void {
  if (S.phase !== "play" || S.relCd > 0) return;
  const om = Math.abs(S.fl.om);
  S.shocks.push({ r: 8, max: 60 + om * 15, grow: 720, hit: [] });
  burst(S.core.x, S.core.y, AC, 14);
  S.fl.om *= 0.4;
  S.relCd = TUNE.releaseCd;
  blip(150, 0.18, "sine", 0.05);
}
function update(dt: number): void {
  if (S.phase !== "play") return;
  S.relCd = Math.max(0, S.relCd - dt);
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
  const accel = S._down && S.dragMoved < FLING && !S.fling.active;
  const target = accel ? S.omCap : S.baseOm;
  S.fl.om += (target - S.fl.om) * Math.min(1, dt * 1.6);
  S.fl.rad = clamp(S.baseR + Math.abs(S.fl.om) * 9, S.baseR, S.maxR);
  S.fl.th += S.fl.om * dt;
  if (S.fling.active) {
    const sp = 900;
    if (S.fling.phase === "out") {
      S.fling.dist += sp * dt;
      if (S.fling.dist >= S.fling.max) {
        S.fling.dist = S.fling.max;
        S.fling.phase = "in";
      }
    } else {
      S.fling.dist -= sp * dt;
      if (S.fling.dist <= S.fl.rad) {
        S.fling.active = false;
      }
    }
  }
  const b = orbPos();
  const speed = S.fling.active ? 900 : Math.abs(S.fl.om) * S.fl.rad;
  S.trail.push({ x: b.x, y: b.y });
  if (S.trail.length > 10) S.trail.shift();
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    e.hitcd = Math.max(0, e.hitcd - dt);
    const hot = S.fling.active || speed > 110;
    if (hot && e.hitcd <= 0 && dist(b.x, b.y, e.x, e.y) < 13 + e.r) {
      if (e.hv && !S.fling.active) {
        e.hp -= speed * 0.012;
        S.fl.om = -S.fl.om * 0.55;
        burst(b.x, b.y, "#fbbf24", 8);
        blip(140, 0.07, "sawtooth", 0.04);
      } else {
        e.hp -= S.fling.active ? 3.5 : speed * 0.02;
        burst(b.x, b.y, AC, 5);
        blip(260, 0.04, "square", 0.03);
      }
      e.hitcd = S.fling.active ? 0.12 : 0.22;
      const ka = Math.atan2(e.y - b.y, e.x - b.x);
      e.x += Math.cos(ka) * 24;
      e.y += Math.sin(ka) * 24;
      S.swingHits++;
      if (e.hp <= 0) {
        S.kills++;
        burst(e.x, e.y, e.hv ? "#fde68a" : "#ff8da1", 7);
      }
    }
    const a = Math.atan2(S.core.y - e.y, S.core.x - e.x);
    e.x += Math.cos(a) * (e.hv ? S.espd * 0.7 : S.espd) * dt;
    e.y += Math.sin(a) * (e.hv ? S.espd * 0.7 : S.espd) * dt;
    if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= e.hv ? TUNE.contactDamageHeavy : TUNE.contactDamage;
      burst(e.x, e.y, "#fff", 6);
      blip(90, 0.12, "sawtooth", 0.045);
    }
  }
  for (const sh of S.shocks) {
    sh.r += sh.grow * dt;
    for (const e of S.en) {
      if (e.hp <= 0 || sh.hit.indexOf(e) >= 0) continue;
      if (dist(e.x, e.y, S.core.x, S.core.y) < sh.r) {
        sh.hit.push(e);
        e.hp -= e.hv ? 5 : 99;
        const a = Math.atan2(e.y - S.core.y, e.x - S.core.x);
        e.x += Math.cos(a) * 30;
        e.y += Math.sin(a) * 30;
        burst(e.x, e.y, AC, 5);
        if (e.hp <= 0) {
          S.kills++;
        }
      }
    }
  }
  S.shocks = S.shocks.filter((sh) => sh.r < sh.max);
  S.en = S.en.filter((e) => e.hp > 0);
  if (Math.abs(S.fl.om) < 2 && !S.fling.active && S.swingHits > 0) {
    S.bestSwing = Math.max(S.bestSwing, S.swingHits);
    S.swingHits = 0;
  }
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
function btn(
  ctx: CanvasRenderingContext2D,
  r: Button,
  label: string,
  on: boolean,
  col: string,
): void {
  rrect(ctx, r.x, r.y, r.w, r.h, 7);
  ctx.fillStyle = on ? col : "rgba(255,255,255,.06)";
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctext(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, 12, on ? "#1a0a0d" : col, 800);
}
function render(ctx: CanvasRenderingContext2D): void {
  const W = S.W,
    H = S.H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0c0709";
  ctx.fillRect(0, 0, W, H);
  const b = orbPos();
  const speed = Math.abs(S.fl.om) * S.fl.rad;
  const fast = S.fling.active || speed > 110;
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(S.core.x, S.core.y, S.fl.rad, 0, TAU);
  ctx.stroke();
  for (const sh of S.shocks) {
    const a = clamp(1 - sh.r / sh.max, 0, 1);
    ctx.strokeStyle = "rgba(251,113,133," + a + ")";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(S.core.x, S.core.y, sh.r, 0, TAU);
    ctx.stroke();
  }
  if (S._down && S.dragMoved >= FLING && !S.fling.active) {
    const ang = Math.atan2(S.ly - S._sy, S.lx - S._sx);
    ctx.strokeStyle = "rgba(251,113,133,.5)";
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(S.core.x, S.core.y);
    ctx.lineTo(
      S.core.x + Math.cos(ang) * Math.min(S.W, S.H) * 0.5,
      S.core.y + Math.sin(ang) * Math.min(S.W, S.H) * 0.5,
    );
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (let i = 0; i < S.trail.length; i++) {
    const t = S.trail[i];
    ctx.globalAlpha = (i / S.trail.length) * 0.5;
    ctx.fillStyle = AC;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 8 * (i / S.trail.length), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const e of S.en) {
    ctx.fillStyle = e.hv ? "#fbbf24" : "#ff5e7e";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.fill();
    if (e.mhp > 3) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3);
      ctx.fillStyle = e.hv ? "#fde68a" : "#ffd0d8";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
    }
  }
  ctx.strokeStyle = fast ? AC : "rgba(251,113,133,.5)";
  ctx.lineWidth = fast ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(S.core.x, S.core.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.save();
  if (fast) {
    ctx.shadowColor = AC;
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = fast ? "#fff" : AC;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 12, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 12;
  ctx.fillStyle = S.core.hp > 30 ? "#fbbf24" : "#ff5e7e";
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
  if (S.swingHits > 1)
    ctext(ctx, "HITS x" + S.swingHits, S.core.x, S.core.y - S.maxR - 12, 15, AC, 800);
  ctx.strokeStyle = "rgba(255,255,255,.15)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(S.core.x, S.core.y, S.core.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU);
  ctx.stroke();
  ctx.strokeStyle = AC;
  ctx.beginPath();
  ctx.arc(
    S.core.x,
    S.core.y,
    S.core.r + 7,
    -Math.PI / 2,
    -Math.PI / 2 + TAU * clamp(Math.abs(S.fl.om) / S.omCap, 0, 1),
  );
  ctx.stroke();
  btn(ctx, S.bRel, S.relCd > 0 ? "RELEASE ..." : "RELEASE ●", S.relCd <= 0, "#fda4af");
  ctext(ctx, "WAVE " + S.wave, 12, 22, 15, AC, 800, "left");
  ctext(
    ctx,
    "MAX HITS " + S.bestSwing + " · KILLS " + S.kills,
    W - 12,
    22,
    13,
    "#cdd5ea",
    700,
    "right",
  );
  ctext(ctx, "HOLD to charge · drag to throw (yo-yo)", W / 2, 22, 11.5, "rgba(251,113,133,.6)", 600);
  rrect(ctx, 12, H - 54, W - 24, 5, 2);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fill();
  rrect(ctx, 12, H - 54, (W - 24) * clamp(S.core.hp / TUNE.coreHP, 0, 1), 5, 2);
  ctx.fillStyle = S.core.hp > 30 ? "#fbbf24" : "#ff5e7e";
  ctx.fill();
  if (S.phase === "ready") {
    overlay(ctx, W, H, 0.78);
    ctext(ctx, "FLAIL", W / 2, H / 2 - 58, 30, AC, 800);
    ctext(
      ctx,
      "No mashing · the flail auto-spins, hold to charge it faster",
      W / 2,
      H / 2 - 18,
      12,
      "#aeb6cc",
      600,
    );
    ctext(
      ctx,
      "Drag one way to throw the flail (yo-yo) and hit enemies in a line · RELEASE (R)",
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
    ctext(ctx, "MAX HITS " + S.bestSwing + " · KILLS " + S.kills, W / 2, H / 2 + 10, 14, "#fff", 700);
    ctext(ctx, "Tap to restart", W / 2, H / 2 + 36, 13, "#aeb6cc", 600);
  }
}
function onDown(x: number, y: number): void {
  if (S.phase !== "play") {
    if (S.phase !== "ready") reset(S.W, S.H);
    S.phase = "play";
    return;
  }
  if (inRect(x, y, S.bRel)) {
    release();
    return;
  }
  S._down = true;
  S.dragMoved = 0;
  S._sx = x;
  S._sy = y;
  S._px = x;
  S._py = y;
  S.lx = x;
  S.ly = y;
}
function onMove(x: number, y: number): void {
  if (S.phase !== "play" || !S._down) return;
  S.dragMoved += dist(x, y, S._px, S._py);
  S._px = x;
  S._py = y;
  S.lx = x;
  S.ly = y;
}
function onUp(): void {
  if (S.phase !== "play") return;
  if (S._down && S.dragMoved >= FLING && !S.fling.active) {
    const ang = Math.atan2(S.ly - S._sy, S.lx - S._sx);
    startFling(ang);
  }
  S._down = false;
}
function onKey(k: string): boolean {
  if (S.phase !== "play") return false;
  if (k === "r" || k === "R") {
    release();
    return true;
  }
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
Engine.defineGame("flail", api, 0.64);
