/**
 * 03 회로 (Circuit) — 노드 드래그 연결 방어 그리드.
 *
 * 원본(_import/batch11.html "03 회로 v3 (Circuit)" IIFE)을 TS로 옮김.
 * 로직·수치·색·파티클 전부 원본 유지. 캔버스 텍스트만 영어로 교체.
 * 등록은 파일 하단 Engine.defineGame('circ', api, 0.66) 한 줄 — 엔진 수정 0.
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
type NodeType = "zap" | "wall" | "slow" | "turret" | "emp";
type CircNode = {
  x: number;
  y: number;
  type: NodeType;
  powered: boolean;
  empT: number;
  tCd: number;
  flash?: number;
  aim?: number;
};
type Link = { a: number; b: number; heat: number };
type Enemy = {
  x: number;
  y: number;
  hp: number;
  mhp: number;
  r: number;
  zap: number;
  brk: boolean;
  sev: number;
};
type Bullet = { x: number; y: number; vx: number; vy: number; life: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; col: string };
type Phase = "ready" | "play" | "over";

type CircState = {
  W: number;
  H: number;
  phase: Phase;
  core: Core;
  nodes: CircNode[];
  links: Link[];
  dragFrom: number;
  dragX: number;
  dragY: number;
  en: Enemy[];
  bul: Bullet[];
  parts: Particle[];
  kills: number;
  wave: number;
  waveT: number;
  spawnT: number;
  spawnGap: number;
  ehp: number;
  best: number;
  maxLink: number;
};

const AC = "#38bdf8";
const TC: Record<NodeType, string> = {
  zap: "#38bdf8",
  wall: "#94a3b8",
  slow: "#7dd3fc",
  turret: "#a78bfa",
  emp: "#f472b6",
};
const LBL: Record<NodeType, string> = { zap: "", wall: "W", slow: "S", turret: "T", emp: "E" };

// 부품 사거리/반경 — 시각·공간 상수라 inline 유지 (밸런스 노브 아님).
const WALLR = 24,
  SLOWR = 72,
  EMPR = 82,
  TRANGE = 210;

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. (값은 원본 그대로, 밸런스 변경 없음.)
 */
const TUNE = {
  coreHP: 100, // 코어 체력 (기존 100)
  waveInterval: 10, // 웨이브 간격 s (기존 10)
  spawnGapStart: 1.0, // 초기 스폰 간격 s (기존 1.0)
  spawnGapFloor: 0.35, // 스폰 간격 하한 (기존 0.35)
  spawnGapDecay: 0.05, // 웨이브당 간격 감소 (기존 0.05)
  doubleSpawnFromWave: 4, // 더블 스폰 시작 웨이브 (기존 wave>3)
  enemyHPBase: 3, // 적 기본 체력 (기존 3)
  enemyHPWaveRamp: 1.3, // 웨이브당 체력 가산 (기존 1.3)
  enemySpeedBase: 22, // 적 기본 이동 (기존 22)
  enemySpeedWaveRamp: 2, // 웨이브당 속도 가산 (기존 2)
  contactDamage: 6, // 코어 접촉 피해 (기존 6)
  zapDPS: 4.5, // 감전링크 초당 피해 (기존 4.5)
  linkSeverTime: 0.4, // 벽파괴형 적이 링크 끊는 시간 s (기존 0.4)
  empCooldown: 2.2, // EMP 재발동 s (기존 2.2)
  empDamage: 6, // EMP 피해 (기존 6)
  turretCooldown: 0.7, // 자동포 발사 간격 s (기존 0.7)
  turretBulletSpeed: 320, // 자동포 탄속 (기존 320)
  turretBulletDamage: 3, // 자동포 탄 피해 (기존 3)
  powCapBase: 8, // 전력 예산 기본값, 총합 = base + wave (기존 8)
};

const S = {} as CircState;

function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H - 20, r: 16, hp: TUNE.coreHP };
  const order: NodeType[] = [
    "zap",
    "wall",
    "slow",
    "turret",
    "emp",
    "zap",
    "wall",
    "slow",
    "turret",
    "emp",
    "zap",
    "zap",
  ];
  for (let i = order.length - 1; i > 0; i--) {
    const j = randi(0, i);
    const t = order[i];
    order[i] = order[j];
    order[j] = t;
  }
  S.nodes = [];
  const cols = 4,
    rows = 3;
  let idx = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      S.nodes.push({
        x: W * (0.13 + (0.74 * c) / (cols - 1)) + rand(-10, 10),
        y: H * (0.16 + (0.5 * r) / (rows - 1)) + rand(-8, 8),
        type: order[idx] || "zap",
        powered: false,
        empT: 0,
        tCd: 0,
      });
      idx++;
    }
  S.links = [];
  S.dragFrom = -1;
  S.dragX = 0;
  S.dragY = 0;
  S.en = [];
  S.bul = [];
  S.parts = [];
  S.kills = 0;
  S.wave = 1;
  S.waveT = 0;
  S.spawnT = 0;
  S.spawnGap = TUNE.spawnGapStart;
  S.ehp = TUNE.enemyHPBase;
  S.best = S.best || 0;
  S.maxLink = W * 0.45;
}
function onResize(W: number, H: number): void {
  S.W = W;
  S.H = H;
  if (S.core) {
    S.core.x = W / 2;
    S.core.y = H - 20;
  }
  S.maxLink = W * 0.45;
}
function burst(x: number, y: number, col: string, k?: number): void {
  k = k || 5;
  for (let i = 0; i < k; i++) {
    const a = rand(0, TAU);
    S.parts.push({
      x,
      y,
      vx: Math.cos(a) * rand(40, 170),
      vy: Math.sin(a) * rand(40, 170),
      life: rand(0.2, 0.45),
      col,
    });
  }
}
function linkIdx(a: number, b: number): number {
  for (let i = 0; i < S.links.length; i++) {
    const L = S.links[i];
    if ((L.a === a && L.b === b) || (L.a === b && L.b === a)) return i;
  }
  return -1;
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
function powCap(): number {
  return TUNE.powCapBase + S.wave;
}
function repower(): void {
  for (const n of S.nodes) n.powered = false;
  for (const L of S.links) {
    S.nodes[L.a].powered = true;
    S.nodes[L.b].powered = true;
  }
}
function spawnEnemy(): void {
  const brk = Math.random() < 0.1 + S.wave * 0.008;
  S.en.push({ x: rand(20, S.W - 20), y: -14, hp: S.ehp, mhp: S.ehp, r: 10, zap: 0, brk, sev: 0 });
}
function update(dt: number): void {
  if (S.phase !== "play") return;
  repower();
  S.waveT += dt;
  if (S.waveT > TUNE.waveInterval) {
    S.waveT = 0;
    S.wave++;
    S.spawnGap = Math.max(TUNE.spawnGapFloor, TUNE.spawnGapStart - S.wave * TUNE.spawnGapDecay);
    S.ehp = TUNE.enemyHPBase + S.wave * TUNE.enemyHPWaveRamp;
    blip(560, 0.14, "sine", 0.045);
  }
  S.spawnT += dt;
  if (S.spawnT >= S.spawnGap) {
    S.spawnT = 0;
    spawnEnemy();
    if (S.wave >= TUNE.doubleSpawnFromWave) spawnEnemy();
  }
  for (const L of S.links) L.heat = Math.max(0, (L.heat || 0) - dt * 3);
  // emp + turret
  for (const n of S.nodes) {
    if (!n.powered) continue;
    if (n.type === "emp") {
      n.empT -= dt;
      if (n.empT <= 0) {
        n.empT = TUNE.empCooldown;
        n.flash = 0.3;
        for (const e of S.en) {
          if (e.hp <= 0) continue;
          if (dist(e.x, e.y, n.x, n.y) < EMPR) {
            e.hp -= TUNE.empDamage;
            burst(e.x, e.y, "#f9a8d4", 3);
            if (e.hp <= 0) {
              S.kills++;
            }
          }
        }
        blip(330, 0.12, "sawtooth", 0.04);
      }
      if (n.flash) n.flash = Math.max(0, n.flash - dt);
    }
    if (n.type === "turret") {
      n.tCd -= dt;
      if (n.tCd <= 0) {
        let tg: Enemy | null = null,
          bd = TRANGE;
        for (const e of S.en) {
          if (e.hp <= 0) continue;
          const d = dist(e.x, e.y, n.x, n.y);
          if (d < bd) {
            bd = d;
            tg = e;
          }
        }
        if (tg) {
          const a = Math.atan2(tg.y - n.y, tg.x - n.x);
          S.bul.push({
            x: n.x,
            y: n.y,
            vx: Math.cos(a) * TUNE.turretBulletSpeed,
            vy: Math.sin(a) * TUNE.turretBulletSpeed,
            life: 1.0,
          });
          n.tCd = TUNE.turretCooldown;
          n.aim = a;
        }
      }
    }
  }
  for (const b of S.bul) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    for (const e of S.en) {
      if (e.hp <= 0) continue;
      if (dist(b.x, b.y, e.x, e.y) < e.r + 3) {
        e.hp -= TUNE.turretBulletDamage;
        b.life = 0;
        burst(b.x, b.y, "#c4b5fd", 3);
        if (e.hp <= 0) {
          S.kills++;
          burst(e.x, e.y, "#a78bfa", 5);
        }
        break;
      }
    }
  }
  S.bul = S.bul.filter((b) => b.life > 0);
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    e.zap = Math.max(0, e.zap - dt * 4);
    // movement with wall avoidance
    let ddx = S.core.x - e.x,
      ddy = S.core.y - e.y;
    const dl = Math.hypot(ddx, ddy) || 1;
    ddx /= dl;
    ddy /= dl;
    for (const n of S.nodes) {
      if (n.type === "wall" && n.powered) {
        const ox = n.x - e.x,
          oy = n.y - e.y;
        const od = Math.hypot(ox, oy) || 1;
        if (od < WALLR + e.r + 24 && ox * ddx + oy * ddy > 0) {
          const w = (WALLR + e.r + 24 - od) / (WALLR + e.r + 24);
          ddx += (-ox / od) * w * 1.2;
          ddy += (-oy / od) * w * 1.2;
          ddx += (-oy / od) * w * 0.9;
          ddy += (ox / od) * w * 0.9;
        }
      }
    }
    const nl = Math.hypot(ddx, ddy) || 1;
    ddx /= nl;
    ddy /= nl;
    let spd = TUNE.enemySpeedBase + S.wave * TUNE.enemySpeedWaveRamp;
    for (const n of S.nodes) {
      if (n.type === "slow" && n.powered && dist(e.x, e.y, n.x, n.y) < SLOWR) {
        spd *= 0.45;
        break;
      }
    }
    e.x += ddx * spd * dt;
    e.y += ddy * spd * dt;
    for (const n of S.nodes) {
      if (n.type === "wall" && n.powered) {
        const d = dist(e.x, e.y, n.x, n.y);
        if (d < WALLR + e.r) {
          const a = Math.atan2(e.y - n.y, e.x - n.x);
          e.x = n.x + Math.cos(a) * (WALLR + e.r);
          e.y = n.y + Math.sin(a) * (WALLR + e.r);
        }
      }
    }
    // zap links
    let onL = false;
    for (let li = 0; li < S.links.length; li++) {
      const L = S.links[li];
      const na = S.nodes[L.a],
        nb = S.nodes[L.b];
      if (pointSeg(e.x, e.y, na.x, na.y, nb.x, nb.y) < e.r + 4) {
        onL = true;
        e.zap = 0.5;
        L.heat = 1;
        if (e.brk) {
          e.sev += dt;
          if (e.sev > TUNE.linkSeverTime) {
            S.links.splice(li, 1);
            li--;
            burst(e.x, e.y, "#fb923c", 6);
            blip(160, 0.08, "sawtooth", 0.04);
            e.sev = 0;
            continue;
          }
        } else {
          e.hp -= TUNE.zapDPS * dt;
          if (Math.random() < 0.25) burst(e.x, e.y, AC, 2);
        }
      }
    }
    if (!onL) e.sev = 0;
    if (e.hp <= 0) {
      S.kills++;
      burst(e.x, e.y, "#ff5e7e", 6);
      continue;
    }
    if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= TUNE.contactDamage;
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
    S.best = Math.max(S.best, S.kills);
    S.phase = "over";
  }
}
function render(ctx: CanvasRenderingContext2D): void {
  const W = S.W,
    H = S.H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#070b14";
  ctx.fillRect(0, 0, W, H);
  // ability fields (powered)
  for (const n of S.nodes) {
    if (!n.powered) continue;
    if (n.type === "slow") {
      ctx.fillStyle = "rgba(125,211,252,.08)";
      ctx.beginPath();
      ctx.arc(n.x, n.y, SLOWR, 0, TAU);
      ctx.fill();
    }
    if (n.type === "emp") {
      const a = (n.flash || 0) / 0.3;
      ctx.strokeStyle = "rgba(244,114,182," + (0.15 + a * 0.5) + ")";
      ctx.lineWidth = 2 + a * 3;
      ctx.beginPath();
      ctx.arc(n.x, n.y, EMPR * (0.4 + 0.6 * (1 - n.empT / 2.2)), 0, TAU);
      ctx.stroke();
    }
  }
  for (const L of S.links) {
    const na = S.nodes[L.a],
      nb = S.nodes[L.b];
    const h = L.heat || 0;
    ctx.strokeStyle = "rgba(56,189,248," + (0.55 + h * 0.45) + ")";
    ctx.lineWidth = 2 + h * 2;
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
    if (h > 0.3) {
      ctx.strokeStyle = "rgba(255,255,255," + h + ")";
      ctx.lineWidth = 1;
      const mx = (na.x + nb.x) / 2 + rand(-4, 4),
        my = (na.y + nb.y) / 2 + rand(-4, 4);
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(mx, my);
      ctx.lineTo(nb.x, nb.y);
      ctx.stroke();
    }
  }
  if (S.dragFrom >= 0) {
    const n = S.nodes[S.dragFrom];
    ctx.strokeStyle = "rgba(56,189,248,.5)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(n.x, n.y);
    ctx.lineTo(S.dragX, S.dragY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(56,189,248,.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(n.x, n.y, S.maxLink, 0, TAU);
    ctx.stroke();
  }
  for (const n of S.nodes) {
    const col = TC[n.type];
    if (n.type === "wall" && n.powered) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(n.x, n.y, WALLR, 0, TAU);
      ctx.stroke();
    }
    if (n.type === "turret" && n.powered && n.aim != null) {
      ctx.strokeStyle = "#1e1b3a";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(n.x + Math.cos(n.aim) * 12, n.y + Math.sin(n.aim) * 12);
      ctx.stroke();
    }
    ctx.fillStyle = n.powered ? "#0b1220" : "#0b1220";
    ctx.strokeStyle = col;
    ctx.lineWidth = n.powered ? 3 : 1.5;
    ctx.globalAlpha = n.powered ? 1 : 0.6;
    ctx.beginPath();
    ctx.arc(n.x, n.y, 8, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (LBL[n.type]) ctext(ctx, LBL[n.type], n.x, n.y + 1, 9, col, 800);
  }
  for (const e of S.en) {
    ctx.fillStyle = e.zap > 0 ? "#bae6fd" : e.brk ? "#fb923c" : "#ff5e7e";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2, 3);
    ctx.fillStyle = "#ffd0d8";
    ctx.fillRect(e.x - e.r, e.y - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
  }
  for (const b of S.bul) {
    ctx.fillStyle = "#c4b5fd";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 14;
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.beginPath();
  ctx.arc(S.core.x, S.core.y, S.core.r, Math.PI, TAU);
  ctx.fill();
  ctx.restore();
  for (const p of S.parts) {
    ctx.globalAlpha = clamp(p.life * 2.5, 0, 1);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
  ctext(ctx, "WAVE " + S.wave, 12, 22, 15, AC, 800, "left");
  ctext(
    ctx,
    "ENERGY " + (powCap() - S.links.length) + "/" + powCap() + " · KILLS " + S.kills,
    W - 12,
    22,
    13,
    "#cdd5ea",
    700,
    "right",
  );
  ctext(
    ctx,
    "Drag node to node to link · W WALL S SLOW T TURRET E EMP",
    W / 2,
    22,
    11.5,
    "rgba(56,189,248,.6)",
    600,
  );
  rrect(ctx, 12, H - 12, W - 24, 6, 3);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fill();
  rrect(ctx, 12, H - 12, (W - 24) * clamp(S.core.hp / 100, 0, 1), 6, 3);
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.fill();
  if (S.phase === "ready") {
    overlay(ctx, W, H, 0.78);
    ctext(ctx, "CIRCUIT", W / 2, H / 2 - 58, 30, AC, 800);
    ctext(
      ctx,
      "Press and drag from a node to instantly link · parts activate once connected",
      W / 2,
      H / 2 - 18,
      12,
      "#aeb6cc",
      600,
    );
    ctext(
      ctx,
      "Wire WALL, SLOW, TURRET and EMP into a defense grid",
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
function pickNode(x: number, y: number): number {
  let b = -1,
    bd = 22;
  for (let i = 0; i < S.nodes.length; i++) {
    const d = dist(x, y, S.nodes[i].x, S.nodes[i].y);
    if (d < bd) {
      bd = d;
      b = i;
    }
  }
  return b;
}
function onDown(x: number, y: number): void {
  if (S.phase !== "play") {
    if (S.phase !== "ready") reset(S.W, S.H);
    S.phase = "play";
    return;
  }
  const n = pickNode(x, y);
  S.dragFrom = n;
  S.dragX = x;
  S.dragY = y;
  if (n >= 0) blip(420, 0.04, "sine", 0.03);
}
function onMove(x: number, y: number): void {
  if (S.phase === "play") {
    S.dragX = x;
    S.dragY = y;
  }
}
function onUp(x: number, y: number): void {
  if (S.phase !== "play") {
    return;
  }
  const from = S.dragFrom;
  S.dragFrom = -1;
  if (from < 0) return;
  const to = pickNode(x, y);
  if (to < 0 || to === from) return;
  const ex = linkIdx(from, to);
  if (ex >= 0) {
    S.links.splice(ex, 1);
    blip(200, 0.05, "square", 0.03);
  } else {
    if (
      dist(S.nodes[from].x, S.nodes[from].y, S.nodes[to].x, S.nodes[to].y) <= S.maxLink &&
      S.links.length < powCap()
    ) {
      S.links.push({ a: from, b: to, heat: 0.6 });
      blip(560, 0.06, "triangle", 0.035);
    } else blip(120, 0.05, "sawtooth", 0.03);
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
  wantsMove: false,
};
Engine.defineGame("circ", api, 0.66);
