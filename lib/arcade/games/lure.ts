/**
 * 05 유인 (Lure) — 미끼로 적을 끌어모아 설치 지뢰로 일망타진.
 *
 * 원본(_import/batch11.html "05 유인 v2 (Lure)" IIFE)을 TS로 옮김.
 * 로직·수치·색·파티클 전부 원본 유지. 캔버스 텍스트만 영어로 교체.
 * 등록은 파일 하단 Engine.defineGame('lure', api, 0.66) 한 줄 — 엔진 수정 0.
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
type Bait = { x: number; y: number };
type Hazard = { x: number; y: number; r: number };
type Mine = {
  x: number;
  y: number;
  trig: number;
  blast: number;
  fuse: number;
  arm: number;
  dead?: boolean;
};
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };
type Enemy = { x: number; y: number; r: number; hp: number; mhp: number; rush: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string };
type Button = { x: number; y: number; w: number; h: number };
type Phase = "ready" | "play" | "over";

type LureState = {
  W: number;
  H: number;
  phase: Phase;
  core: Core;
  bait: Bait;
  drag: boolean;
  haz: Hazard[];
  mines: Mine[];
  bul: Bullet[];
  en: Enemy[];
  parts: Particle[];
  mineCd: number;
  combo: number;
  comboT: number;
  bestCombo: number;
  kills: number;
  wave: number;
  waveT: number;
  spawnT: number;
  spawnGap: number;
  espd: number;
  tCd: number;
  bMine: Button;
  taim?: number;
  score?: number;
};

const AC = "#34d399";
const LURER = 140;

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. (값은 원본 그대로 — 밸런스 변경 X.)
 */
const TUNE = {
  coreHP: 100, // 코어 체력
  waveInterval: 10, // 웨이브 간격 s
  spawnGapStart: 0.85, // 초기 스폰 간격 s
  spawnGapFloor: 0.32, // 스폰 간격 하한
  spawnGapDecay: 0.04, // 웨이브당 간격 감소
  doubleSpawnFromWave: 2, // 더블 스폰 시작(초과) 웨이브
  enemySpeedBase: 24, // 기본 이동 속도
  enemySpeedWaveRamp: 3, // 웨이브당 속도 가산
  rushSpeedMult: 1.25, // 돌격 적 속도 배수
  rushChanceBase: 0.16, // 돌격 적 확률 기본
  rushChanceWaveRamp: 0.015, // 웨이브당 돌격 확률 가산
  enemyHpRush: 6, // 돌격 적 체력
  enemyHpNormal: 3, // 일반 적 체력
  contactDamageRush: 9, // 돌격 적 접촉 피해
  contactDamageNormal: 6, // 일반 적 접촉 피해
  mineCooldown: 2.4, // 지뢰 설치 쿨다운 s
  mineDamage: 8, // 지뢰 폭발 피해
  turretCooldown: 0.55, // 자동포 발사 쿨다운 s
  turretRange: 300, // 자동포 사거리
  turretDamage: 3, // 자동포 탄 피해
  turretBulletSpeed: 320, // 자동포 탄 속도
  hazardDps: 14, // 위험지대 초당 피해
};

const S = {} as LureState;

function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H / 2, r: 16, hp: TUNE.coreHP };
  S.bait = { x: W / 2, y: H * 0.3 };
  S.drag = false;
  S.haz = [];
  for (let i = 0; i < 2; i++) S.haz.push({ x: rand(W * 0.2, W * 0.8), y: rand(H * 0.2, H * 0.8), r: 46 });
  S.mines = [];
  S.bul = [];
  S.en = [];
  S.parts = [];
  S.mineCd = 0;
  S.combo = 0;
  S.comboT = 0;
  S.bestCombo = S.bestCombo || 0;
  S.kills = 0;
  S.wave = 1;
  S.waveT = 0;
  S.spawnT = 0;
  S.spawnGap = TUNE.spawnGapStart;
  S.espd = TUNE.enemySpeedBase;
  S.tCd = 0;
  layoutBtns();
}
function layoutBtns(): void {
  const W = S.W,
    H = S.H;
  S.bMine = { x: W / 2 - 66, y: H - 42, w: 132, h: 30 };
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
function burst(x: number, y: number, col: string, k?: number, sp?: number): void {
  k = k || 6;
  sp = sp || 180;
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
function inRect(x: number, y: number, r: Button): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
function spawnEnemy(): void {
  const a = rand(0, TAU);
  const R = Math.max(S.W, S.H) * 0.6;
  const rush = Math.random() < TUNE.rushChanceBase + S.wave * TUNE.rushChanceWaveRamp;
  S.en.push({
    x: S.core.x + Math.cos(a) * R,
    y: S.core.y + Math.sin(a) * R,
    r: rush ? 12 : 10,
    hp: rush ? TUNE.enemyHpRush : TUNE.enemyHpNormal,
    mhp: rush ? TUNE.enemyHpRush : TUNE.enemyHpNormal,
    rush,
  });
}
function placeMine(): void {
  if (S.mineCd > 0) return;
  S.mines.push({ x: S.bait.x, y: S.bait.y, trig: 30, blast: 74, fuse: 3.0, arm: 0.3 });
  S.mineCd = TUNE.mineCooldown;
  blip(440, 0.08, "triangle", 0.04);
}
function detonate(m: Mine): void {
  let n = 0;
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    if (dist(e.x, e.y, m.x, m.y) < m.blast) {
      e.hp -= TUNE.mineDamage;
      if (e.hp <= 0) {
        n++;
      }
    }
  }
  burst(m.x, m.y, "#fca5a5", 16, 260);
  blip(150, 0.2, "sawtooth", 0.05);
  if (n > 0) {
    S.kills += n;
    if (n >= 2) {
      S.combo = n;
      S.comboT = 1.1;
      S.score = S.score || 0;
      S.bestCombo = Math.max(S.bestCombo, n);
      blip(680, 0.18, "sine", 0.05);
    } else {
      S.combo = 0;
    }
  }
}
function update(dt: number): void {
  if (S.phase !== "play") return;
  S.mineCd = Math.max(0, S.mineCd - dt);
  S.comboT = Math.max(0, S.comboT - dt);
  if (S.comboT <= 0) S.combo = 0;
  S.tCd = Math.max(0, S.tCd - dt);
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
  // turret
  if (S.tCd <= 0) {
    let tg: Enemy | null = null;
    let bd = TUNE.turretRange;
    for (const e of S.en) {
      if (e.hp <= 0) continue;
      const d = dist(e.x, e.y, S.core.x, S.core.y);
      if (d < bd) {
        bd = d;
        tg = e;
      }
    }
    if (tg) {
      const a = Math.atan2(tg.y - S.core.y, tg.x - S.core.x);
      S.bul.push({
        x: S.core.x,
        y: S.core.y,
        vx: Math.cos(a) * TUNE.turretBulletSpeed,
        vy: Math.sin(a) * TUNE.turretBulletSpeed,
        life: 1.2,
      });
      S.tCd = TUNE.turretCooldown;
      S.taim = a;
    }
  }
  for (const b of S.bul) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of S.en) {
      if (e.hp <= 0) continue;
      if (dist(b.x, b.y, e.x, e.y) < e.r + 3) {
        e.hp -= TUNE.turretDamage;
        b.life = 0;
        burst(b.x, b.y, "#6ee7b7", 3);
        if (e.hp <= 0) {
          S.kills++;
          burst(e.x, e.y, AC, 5);
        }
        break;
      }
    }
  }
  S.bul = S.bul.filter((b) => b.life > 0);
  for (const m of S.mines) {
    m.arm = Math.max(0, m.arm - dt);
    m.fuse -= dt;
    if (m.arm <= 0) {
      let near = false;
      for (const e of S.en) {
        if (e.hp > 0 && dist(e.x, e.y, m.x, m.y) < m.trig) {
          near = true;
          break;
        }
      }
      if (near || m.fuse <= 0) {
        detonate(m);
        m.dead = true;
      }
    }
  }
  S.mines = S.mines.filter((m) => !m.dead);
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    let tx = S.core.x,
      ty = S.core.y;
    if (!e.rush && dist(e.x, e.y, S.bait.x, S.bait.y) < LURER) {
      tx = S.bait.x;
      ty = S.bait.y;
    }
    const a = Math.atan2(ty - e.y, tx - e.x);
    const sp = e.rush ? S.espd * TUNE.rushSpeedMult : S.espd;
    e.x += Math.cos(a) * sp * dt;
    e.y += Math.sin(a) * sp * dt;
    for (const h of S.haz) {
      if (dist(e.x, e.y, h.x, h.y) < h.r) {
        e.hp -= TUNE.hazardDps * dt;
        if (Math.random() < 0.15) burst(e.x, e.y, "#f87171", 2);
      }
    }
    if (e.hp <= 0) {
      S.kills++;
      burst(e.x, e.y, "#fca5a5", 6);
      continue;
    }
    if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= e.rush ? TUNE.contactDamageRush : TUNE.contactDamageNormal;
      burst(e.x, e.y, "#fff", 6);
      blip(90, 0.12, "sawtooth", 0.045);
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
  ctext(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1, 12, on ? "#052e1a" : col, 800);
}
function render(ctx: CanvasRenderingContext2D): void {
  const W = S.W,
    H = S.H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#070f0b";
  ctx.fillRect(0, 0, W, H);
  for (const h of S.haz) {
    ctx.fillStyle = "rgba(248,113,113,.1)";
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(248,113,113,.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = "rgba(52,211,153,.25)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.arc(S.bait.x, S.bait.y, LURER, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const m of S.mines) {
    const arm = m.arm <= 0;
    ctx.fillStyle = arm ? "rgba(252,165,165,.18)" : "rgba(148,163,184,.15)";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.blast, 0, TAU);
    ctx.fill();
    ctx.fillStyle = arm ? "#f87171" : "#94a3b8";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = arm ? "rgba(248,113,113,.6)" : "rgba(148,163,184,.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.trig, 0, TAU);
    ctx.stroke();
  }
  if (S.taim != null) {
    ctx.strokeStyle = "#065f46";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(S.core.x, S.core.y);
    ctx.lineTo(S.core.x + Math.cos(S.taim) * 14, S.core.y + Math.sin(S.taim) * 14);
    ctx.stroke();
  }
  for (const b of S.bul) {
    ctx.fillStyle = "#6ee7b7";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, TAU);
    ctx.fill();
  }
  for (const e of S.en) {
    const lure = !e.rush && dist(e.x, e.y, S.bait.x, S.bait.y) < LURER;
    ctx.fillStyle = e.rush ? "#fbbf24" : lure ? "#fca5a5" : "#ff5e7e";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.fill();
    if (e.mhp > 3) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3);
      ctx.fillStyle = e.rush ? "#fde68a" : "#ffd0d8";
      ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
    }
  }
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(S.bait.x, S.bait.y, 7, 0, TAU);
  ctx.fill();
  ctx.restore();
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
  if (S.combo >= 2 && S.comboT > 0)
    ctext(ctx, "COMBO ×" + S.combo, S.core.x, H / 2 - 40, 20, AC, 800);
  btn(
    ctx,
    S.bMine,
    S.mineCd > 0 ? "MINE " + S.mineCd.toFixed(1) + "s" : "PLACE MINE ●",
    S.mineCd <= 0,
    "#6ee7b7",
  );
  ctext(ctx, "WAVE " + S.wave, 12, 22, 15, AC, 800, "left");
  ctext(
    ctx,
    "MAX COMBO " + S.bestCombo + " · KILLS " + S.kills,
    W - 12,
    22,
    13,
    "#cdd5ea",
    700,
    "right",
  );
  ctext(
    ctx,
    "Lure with bait · drop mines to wipe · yellow are chargers",
    W / 2,
    22,
    11.5,
    "rgba(52,211,153,.6)",
    600,
  );
  rrect(ctx, 12, H - 54, W - 24, 5, 2);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fill();
  rrect(ctx, 12, H - 54, (W - 24) * clamp(S.core.hp / TUNE.coreHP, 0, 1), 5, 2);
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.fill();
  if (S.phase === "ready") {
    overlay(ctx, W, H, 0.78);
    ctext(ctx, "LURE", W / 2, H / 2 - 58, 30, AC, 800);
    ctext(
      ctx,
      "Drag the bait and enemies chase it instead of the core",
      W / 2,
      H / 2 - 18,
      12,
      "#aeb6cc",
      600,
    );
    ctext(
      ctx,
      "Drop a mine on the bait to wipe them · combo bonus · turret handles chargers",
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
    ctext(ctx, "MAX COMBO " + S.bestCombo + " · KILLS " + S.kills, W / 2, H / 2 + 10, 14, "#fff", 700);
    ctext(ctx, "Tap to restart", W / 2, H / 2 + 36, 13, "#aeb6cc", 600);
  }
}
function onDown(x: number, y: number): void {
  if (S.phase !== "play") {
    if (S.phase !== "ready") reset(S.W, S.H);
    S.phase = "play";
    return;
  }
  if (inRect(x, y, S.bMine)) {
    placeMine();
    return;
  }
  S.drag = true;
  S.bait.x = x;
  S.bait.y = y;
}
function onMove(x: number, y: number): void {
  if (S.phase === "play" && S.drag) {
    S.bait.x = x;
    S.bait.y = y;
  }
}
function onUp(): void {
  S.drag = false;
}
function onKey(k: string): boolean {
  if (S.phase !== "play") return false;
  if (k === " " || k === "Spacebar") {
    placeMine();
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
  wantsMove: true,
};
Engine.defineGame("lure", api, 0.66);
