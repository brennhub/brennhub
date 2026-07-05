/**
 * 01 등대 (Beacon) — 회전 거울 반사 코어 디펜스.
 *
 * 원본(_import/batch11.html "01 등대 v3 (Beacon)" IIFE)을 TS로 옮김.
 * 로직·수치·색·파티클 전부 원본 유지. 캔버스 텍스트만 영어로 교체.
 * 등록은 파일 하단 Engine.defineGame('beacon', api, 0.66) 한 줄 — 엔진 수정 0.
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
type Enemy = { x: number; y: number; r: number; hp: number; mhp: number; um: boolean; lit: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string };
type Obstacle = { x: number; y: number; r: number };
type Mirror = {
  x: number;
  y: number;
  r: number;
  refAng: number;
  refHW: number;
  rot: number;
  isLit: boolean;
};
type Button = { x: number; y: number; w: number; h: number };
type Phase = "ready" | "play" | "over";
type Mode = "focus" | "spread";

type BeaconState = {
  W: number;
  H: number;
  phase: Phase;
  core: Core;
  aim: number;
  mode: Mode;
  en: Enemy[];
  parts: Particle[];
  charge: number;
  flashT: number;
  obs: Obstacle[];
  mirrors: Mirror[];
  pts: number;
  powLv: number;
  rngLv: number;
  kills: number;
  wave: number;
  waveT: number;
  spawnT: number;
  spawnGap: number;
  best: number;
  btns: Button[];
};

const AC = "#fde047";
const MODES: Record<Mode, { HW: number; dps: number; rng: number }> = {
  focus: { HW: 0.22, dps: 4.4, rng: 1.25 },
  spread: { HW: 0.52, dps: 2.3, rng: 0.92 },
};
const MIRMAX = 5;

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. (괄호는 이번 완화 전 값.)
 */
const TUNE = {
  coreHP: 120, // 코어 체력 (기존 100)
  waveInterval: 12, // 웨이브 간격 s (기존 10)
  spawnGapStart: 1.05, // 초기 스폰 간격 s (기존 0.9)
  spawnGapFloor: 0.42, // 스폰 간격 하한 (기존 0.34)
  spawnGapDecay: 0.038, // 웨이브당 간격 감소 (기존 0.045)
  doubleSpawnFromWave: 4, // 더블 스폰 시작 웨이브 (기존 3)
  enemySpeedBase: 20, // 비피격 이동 (기존 24)
  enemySpeedLit: 14, // 피격 중 이동 (기존 16)
  enemySpeedWaveRamp: 1.6, // 웨이브당 속도 가산 (기존 2)
  contactDamage: 5, // 코어 접촉 피해 (기존 6)
  mirrorChainMaxHops: MIRMAX, // 미러→미러 연쇄 전파 최대 hop (0=연쇄 끄기=기존 동작)
};

const S = {} as BeaconState;

function newMirror(W: number, H: number): Mirror {
  const mx = rand(W * 0.18, W * 0.82),
    my = rand(H * 0.2, H * 0.8);
  return {
    x: mx,
    y: my,
    r: 15,
    refAng: rand(0, TAU),
    refHW: 0.32,
    rot: rand(0.35, 0.75) * (Math.random() < 0.5 ? 1 : -1),
    isLit: false,
  };
}
function setupField(W: number, H: number): void {
  S.obs = [];
  for (let i = 0; i < 2; i++)
    S.obs.push({ x: rand(W * 0.2, W * 0.8), y: rand(H * 0.24, H * 0.76), r: rand(15, 20) });
  S.mirrors = [newMirror(W, H), newMirror(W, H)];
}
function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H / 2, r: 15, hp: TUNE.coreHP };
  S.aim = -Math.PI / 2;
  S.mode = "focus";
  S.en = [];
  S.parts = [];
  S.charge = 0;
  S.flashT = 0;
  setupField(W, H);
  S.pts = 0;
  S.powLv = 0;
  S.rngLv = 0;
  S.kills = 0;
  S.wave = 1;
  S.waveT = 0;
  S.spawnT = 0;
  S.spawnGap = TUNE.spawnGapStart;
  S.best = S.best || 0;
  layoutBtns();
}
function layoutBtns(): void {
  const W = S.W,
    H = S.H;
  const y = H - 40,
    h = 30,
    gap = 6,
    n = 5,
    bw = (W - 24 - gap * (n - 1)) / n;
  S.btns = [];
  for (let i = 0; i < n; i++) S.btns.push({ x: 12 + i * (bw + gap), y, w: bw, h });
}
function onResize(W: number, H: number): void {
  S.W = W;
  S.H = H;
  if (S.core) {
    S.core.x = W / 2;
    S.core.y = H / 2;
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
      vx: Math.cos(a) * rand(40, 180),
      vy: Math.sin(a) * rand(40, 180),
      life: rand(0.25, 0.5),
      col,
    });
  }
}
function angDiff(a: number, b: number): number {
  let d = (a - b + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}
function blockers(skip: Mirror | null): (Obstacle | Mirror)[] {
  const arr: (Obstacle | Mirror)[] = [];
  for (const o of S.obs) arr.push(o);
  for (const m of S.mirrors) if (m !== skip) arr.push(m);
  return arr;
}
function occ(sx: number, sy: number, ex: number, ey: number, skip: Mirror | null): boolean {
  const dx = ex - sx,
    dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  for (const p of blockers(skip)) {
    const px = p.x - sx,
      py = p.y - sy;
    const t = px * ux + py * uy;
    if (t > 4 && t < len - 2) {
      if (Math.abs(px * uy - py * ux) < p.r) return true;
    }
  }
  return false;
}
function inRect(x: number, y: number, r: Button): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
function dpsNow(): number {
  return MODES[S.mode].dps * (1 + S.powLv * 0.35);
}
function rngNow(): number {
  return Math.max(S.W, S.H) * 1.2 * MODES[S.mode].rng * (1 + S.rngLv * 0.15);
}
function mirRange(): number {
  return Math.max(S.W, S.H) * 0.5 * (1 + S.rngLv * 0.15);
}
function spawnEnemy(): void {
  const a = rand(0, TAU);
  const R = Math.max(S.W, S.H) * 0.62;
  const um = Math.random() < 0.18 + S.wave * 0.02;
  S.en.push({
    x: S.core.x + Math.cos(a) * R,
    y: S.core.y + Math.sin(a) * R,
    r: 10,
    hp: um ? 5 : 3,
    mhp: um ? 5 : 3,
    um,
    lit: 0,
  });
}
function flash(): void {
  if (S.charge < 1) return;
  S.charge = 0;
  S.flashT = 0.42;
  for (const e of S.en) {
    e.hp -= e.um ? 7 : 3.6;
    burst(e.x, e.y, "#fff", 5);
    if (e.hp <= 0) {
      S.kills++;
      S.pts++;
    }
  }
  blip(700, 0.2, "sine", 0.05);
}
function mirCost(): number {
  return 12 + S.mirrors.length * 8;
}
function powCost(): number {
  return 10 + S.powLv * 8;
}
function rngCost(): number {
  return 10 + S.rngLv * 8;
}
function buy(i: number): void {
  if (i === 2) {
    if (S.mirrors.length < MIRMAX && S.pts >= mirCost()) {
      S.pts -= mirCost();
      S.mirrors.push(newMirror(S.W, S.H));
      blip(620, 0.1, "triangle", 0.04);
    }
  } else if (i === 3) {
    if (S.pts >= powCost()) {
      S.pts -= powCost();
      S.powLv++;
      blip(560, 0.09, "triangle", 0.04);
    }
  } else if (i === 4) {
    if (S.pts >= rngCost()) {
      S.pts -= rngCost();
      S.rngLv++;
      blip(520, 0.09, "triangle", 0.04);
    }
  }
}
function update(dt: number): void {
  if (S.phase !== "play") return;
  S.flashT = Math.max(0, S.flashT - dt);
  const M = MODES[S.mode];
  const rng = rngNow();
  S.waveT += dt;
  if (S.waveT > TUNE.waveInterval) {
    S.waveT = 0;
    S.wave++;
    S.spawnGap = Math.max(TUNE.spawnGapFloor, TUNE.spawnGapStart - S.wave * TUNE.spawnGapDecay);
    blip(560, 0.14, "sine", 0.045);
  }
  S.spawnT += dt;
  if (S.spawnT >= S.spawnGap) {
    S.spawnT = 0;
    spawnEnemy();
    if (S.wave >= TUNE.doubleSpawnFromWave) spawnEnemy();
  }
  // (1) 직접 점등: 회전 유지 + 코어 빔 부채꼴 안이면 켜짐 (기존 동작).
  for (const m of S.mirrors) {
    m.refAng += m.rot * dt;
    const ang = Math.atan2(m.y - S.core.y, m.x - S.core.x);
    m.isLit = Math.abs(angDiff(ang, S.aim)) < M.HW && !occ(S.core.x, S.core.y, m.x, m.y, m);
  }
  // (2) 연쇄 전파: 켜진 미러 src의 반사 콘이 아직 안 켜진 미러 dst를 켠다. 그렇게 켜진 미러도
  //     적을 태우고 또 다른 미러를 켠다 (렌더·적 반사 루프가 isLit 미러 전부를 순회 → 자동 반영).
  //     isLit은 여기서 true로만 설정(단조) → 새로 켜지는 미러 없으면 종료, 무한루프 불가.
  //     occ 스킵은 src(자기 차단 방지); dst는 광선 끝점이라 occ의 t<len-2로 자연 제외.
  const mrChain = mirRange();
  for (let hop = 0; hop < TUNE.mirrorChainMaxHops; hop++) {
    let changed = false;
    for (const src of S.mirrors) {
      if (!src.isLit) continue;
      for (const dst of S.mirrors) {
        if (dst.isLit || dst === src) continue;
        const a = Math.atan2(dst.y - src.y, dst.x - src.x);
        if (
          Math.abs(angDiff(a, src.refAng)) < src.refHW &&
          dist(src.x, src.y, dst.x, dst.y) < mrChain &&
          !occ(src.x, src.y, dst.x, dst.y, src)
        ) {
          dst.isLit = true;
          changed = true;
        }
      }
    }
    if (!changed) break;
  }
  let anyLit = false;
  const mr = mirRange();
  const dps = dpsNow();
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    let L = 0;
    const ang = Math.atan2(e.y - S.core.y, e.x - S.core.x);
    const d = dist(e.x, e.y, S.core.x, S.core.y);
    if (d < rng && Math.abs(angDiff(ang, S.aim)) < M.HW && !occ(S.core.x, S.core.y, e.x, e.y, null))
      L = 1;
    if (!L) {
      for (const m of S.mirrors) {
        if (m.isLit) {
          const a2 = Math.atan2(e.y - m.y, e.x - m.x);
          if (
            dist(e.x, e.y, m.x, m.y) < mr &&
            Math.abs(angDiff(a2, m.refAng)) < m.refHW &&
            !occ(m.x, m.y, e.x, e.y, m)
          ) {
            L = 1;
            break;
          }
        }
      }
    }
    e.lit = L ? 1 : Math.max(0, e.lit - dt * 3);
    if (L) {
      anyLit = true;
      e.hp -= dps * (e.um ? 0.32 : 1) * dt;
      if (e.hp <= 0) {
        S.kills++;
        S.pts++;
        burst(e.x, e.y, AC, 7);
        continue;
      }
    }
    // move with obstacle avoidance
    let ddx = S.core.x - e.x,
      ddy = S.core.y - e.y;
    const dl = Math.hypot(ddx, ddy) || 1;
    ddx /= dl;
    ddy /= dl;
    for (const o of blockers(null)) {
      const ox = o.x - e.x,
        oy = o.y - e.y;
      const od = Math.hypot(ox, oy) || 1;
      if (od < o.r + 46 && ox * ddx + oy * ddy > 0) {
        const w = (o.r + 46 - od) / (o.r + 46);
        ddx += (-ox / od) * w * 1.1;
        ddy += (-oy / od) * w * 1.1;
        ddx += (-oy / od) * w * 0.9;
        ddy += (ox / od) * w * 0.9;
      }
    }
    const nl = Math.hypot(ddx, ddy) || 1;
    ddx /= nl;
    ddy /= nl;
    const sp = (L ? TUNE.enemySpeedLit : TUNE.enemySpeedBase) + S.wave * TUNE.enemySpeedWaveRamp;
    e.x += ddx * sp * dt;
    e.y += ddy * sp * dt;
    if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= TUNE.contactDamage;
      burst(e.x, e.y, "#fff", 6);
      blip(90, 0.12, "sawtooth", 0.045);
    }
  }
  if (anyLit) S.charge = Math.min(1, S.charge + dt * 0.5);
  S.en = S.en.filter((e) => e.hp > 0);
  for (const p of S.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  S.parts = S.parts.filter((p) => p.life > 0);
  if (S.core.hp <= 0) {
    S.core.hp = 0;
    S.best = Math.max(S.best, S.kills);
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
  ctext(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, 11, on ? "#06121e" : col, 800);
}
function render(ctx: CanvasRenderingContext2D): void {
  const W = S.W,
    H = S.H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#05060c";
  ctx.fillRect(0, 0, W, H);
  const cx = S.core.x,
    cy = S.core.y;
  const M = MODES[S.mode];
  const FAR = Math.max(W, H) * 1.2;
  const rng = rngNow();
  const mr = mirRange();
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, rng);
  g.addColorStop(0, "rgba(253,224,71,.28)");
  g.addColorStop(1, "rgba(253,224,71,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, rng, S.aim - M.HW, S.aim + M.HW);
  ctx.closePath();
  ctx.fill();
  for (const p of blockers(null)) {
    const dx = p.x - cx,
      dy = p.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    const ta = Math.asin(Math.min(0.99, p.r / d));
    const a1 = ang - ta,
      a2 = ang + ta;
    ctx.fillStyle = "#05060c";
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a1) * d, cy + Math.sin(a1) * d);
    ctx.lineTo(cx + Math.cos(a1) * FAR, cy + Math.sin(a1) * FAR);
    ctx.lineTo(cx + Math.cos(a2) * FAR, cy + Math.sin(a2) * FAR);
    ctx.lineTo(cx + Math.cos(a2) * d, cy + Math.sin(a2) * d);
    ctx.closePath();
    ctx.fill();
  }
  for (const m of S.mirrors) {
    if (m.isLit) {
      const g2 = ctx.createRadialGradient(m.x, m.y, 6, m.x, m.y, mr);
      g2.addColorStop(0, "rgba(125,211,252,.3)");
      g2.addColorStop(1, "rgba(125,211,252,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.arc(m.x, m.y, mr, m.refAng - m.refHW, m.refAng + m.refHW);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (const e of S.en) {
    const L = e.lit > 0.1;
    ctx.fillStyle = e.um ? (L ? "#c4b5fd" : "#3a3358") : L ? "#fff7cc" : "#3a4456";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.fill();
    if (L) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3);
      ctx.fillStyle = e.um ? "#a78bfa" : "#fde047";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
    }
  }
  for (const o of S.obs) {
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  for (const m of S.mirrors) {
    ctx.fillStyle = "#1e3a5f";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + Math.cos(m.refAng) * m.r, m.y + Math.sin(m.refAng) * m.r);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 18;
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.beginPath();
  ctx.arc(cx, cy, S.core.r, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (S.flashT > 0) {
    ctx.fillStyle = "rgba(255,255,240," + (S.flashT / 0.42) * 0.5 + ")";
    ctx.fillRect(0, 0, W, H);
  }
  for (const p of S.parts) {
    ctx.globalAlpha = clamp(p.life * 2.2, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  const b = S.btns;
  btn(ctx, b[0], S.mode === "focus" ? "FOCUS" : "SPREAD", true, "#fde047");
  btn(
    ctx,
    b[1],
    S.charge >= 1 ? "FLASH ●" : "FLASH " + Math.round(S.charge * 100) + "%",
    S.charge >= 1,
    "#fff7cc",
  );
  btn(
    ctx,
    b[2],
    S.mirrors.length >= MIRMAX ? "MIRROR MAX" : "+MIRROR " + mirCost(),
    S.pts >= mirCost() && S.mirrors.length < MIRMAX,
    "#7dd3fc",
  );
  btn(ctx, b[3], "+POWER " + powCost(), S.pts >= powCost(), "#fda4af");
  btn(ctx, b[4], "+RANGE " + rngCost(), S.pts >= rngCost(), "#86efac");
  ctext(ctx, "WAVE " + S.wave, 12, 20, 15, AC, 800, "left");
  ctext(ctx, "SCORE " + S.pts + " · KILLS " + S.kills, W - 12, 20, 13, "#cdd5ea", 700, "right");
  ctext(
    ctx,
    "PWR Lv" + S.powLv + " · RNG Lv" + S.rngLv + " · MIRRORS " + S.mirrors.length,
    W / 2,
    20,
    11.5,
    "rgba(253,224,71,.7)",
    600,
  );
  rrect(ctx, 12, H - 52, W - 24, 5, 2);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fill();
  rrect(ctx, 12, H - 52, (W - 24) * clamp(S.core.hp / TUNE.coreHP, 0, 1), 5, 2);
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.fill();
  if (S.phase === "ready") {
    overlay(ctx, W, H, 0.78);
    ctext(ctx, "BEACON", W / 2, H / 2 - 58, 30, AC, 800);
    ctext(
      ctx,
      "Drag to aim the beam · rotating mirror-beacons sweep blind spots",
      W / 2,
      H / 2 - 18,
      12,
      "#aeb6cc",
      600,
    );
    ctext(
      ctx,
      "Spend kill-score: +MIRROR / +POWER / +RANGE · enemies path around obstacles",
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
    ctext(ctx, "KILLS " + S.kills + " · WAVE " + S.wave, W / 2, H / 2 + 10, 14, "#fff", 700);
    ctext(ctx, "Tap to restart", W / 2, H / 2 + 36, 13, "#aeb6cc", 600);
  }
}
function onDown(x: number, y: number): void {
  if (S.phase !== "play") {
    if (S.phase !== "ready") reset(S.W, S.H);
    S.phase = "play";
    return;
  }
  for (let i = 0; i < S.btns.length; i++) {
    if (inRect(x, y, S.btns[i])) {
      if (i === 0) {
        S.mode = S.mode === "focus" ? "spread" : "focus";
        blip(360, 0.05, "square", 0.03);
      } else if (i === 1) {
        flash();
      } else {
        buy(i);
      }
      return;
    }
  }
  S.aim = Math.atan2(y - S.core.y, x - S.core.x);
}
function onMove(x: number, y: number): void {
  if (S.phase === "play") S.aim = Math.atan2(y - S.core.y, x - S.core.x);
}
function onUp(): void {}
function onKey(k: string): boolean {
  if (S.phase !== "play") return false;
  if (k === "f" || k === "F") {
    S.mode = S.mode === "focus" ? "spread" : "focus";
    return true;
  }
  if (k === " " || k === "Spacebar" || k === "Enter") {
    flash();
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
  wantsMove: true,
};
Engine.defineGame("beacon", api, 0.66);
