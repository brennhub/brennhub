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

type Core = { x: number; y: number; r: number; hp: number; hitT: number };
type Enemy = {
  x: number;
  y: number;
  r: number;
  hp: number;
  mhp: number;
  um: boolean;
  raider: boolean;
  lit: number;
  contact: boolean; // raider가 미러 가장자리 접촉 중(부딪힘 연출용)
  bx: number; // 접촉 시 미러 방향 단위벡터 (부딪힘 오프셋용)
  by: number;
};
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
  hp: number;
  mhp: number;
  hitT: number; // 피격 플래시 타이머
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
  pendingMirrors: number; // 직접 배치 대기 중인 미러 수
  ptr: { x: number; y: number } | null; // 고스트 미리보기용 포인터 좌표
  shakeT: number; // 코어 피격 화면 흔들 타이머
  time: number; // 연출 위상용 시간 누적
};

const AC = "#fde047";
const MODES: Record<Mode, { HW: number; dps: number }> = {
  focus: { HW: 0.22, dps: 4.4 }, // 좁은 폭·높은 dps
  spread: { HW: 0.52, dps: 2.3 }, // 넓은 폭·낮은 dps (사거리는 mode 무관 동일)
};
const MIRMAX = 6; // 배치+대기 미러 상한 (기존 5)

/**
 * 난이도 노브 — 이 블록만 만지면 밸런스가 바뀐다 (6종 공통 패턴).
 * 로직/구조는 불변, 값만 여기서 경유. (괄호는 이번 완화 전 값.)
 */
const TUNE = {
  coreHP: 130, // 코어 체력 (기존 150)
  waveInterval: 12, // 웨이브 간격 s (기존 14)
  spawnGapStart: 1.05, // 초기 스폰 간격 s (기존 1.2)
  spawnGapFloor: 0.42, // 스폰 간격 하한 (기존 0.5)
  spawnGapDecay: 0.032, // 웨이브당 간격 감소
  doubleSpawnFromWave: 4, // 더블 스폰 시작 웨이브 (기존 5)
  enemySpeedBase: 20, // 비피격 이동 (기존 18)
  enemySpeedLit: 12, // 피격 중 이동
  enemySpeedWaveRamp: 1.5, // 웨이브당 속도 가산 (기존 1.3)
  contactDamage: 5, // 코어 접촉 피해 (기존 4)
  startMirrors: 2, // 시작 시 직접 배치할 미러 수
  obstacleCoreGap: 70, // 장애물↔코어 최소 여유거리 px
  obstacleGap: 40, // 장애물↔장애물·미러 최소 여유거리 px
  obstacleWaveInterval: 10, // 이 웨이브마다 장애물 +1
  obstacleMax: 8, // 장애물 최대 수
  umHP: 4, // 장갑형(um) 체력 (기존 3)
  umBeamMult: 0.6, // 장갑형 빔 데미지 배율 (클수록 잘 녹음)
  umFlashDmg: 7, // 장갑형 섬광 데미지
  umSpawnBase: 0.12, // 장갑형 스폰 기본 확률
  umSpawnRamp: 0.015, // 웨이브당 장갑형 확률 증가
  flashChargePerDmg: 0.015, // 적에게 준 데미지당 FLASH 충전량 (스핀 악용 방지: 실제 데미지에만 연동)
  rangeBase: 0.35, // 빔·미러 공용 사거리 기저 배율 (단일 소스, +RANGE로 성장)
  mirrorHP: 6, // 미러 체력 (raider가 깎음)
  raiderSpawnBase: 0.15, // raider 스폰 기본 확률
  raiderSpawnRamp: 0.01, // 웨이브당 raider 확률 증가
  raiderHP: 4, // raider 체력
  raiderMirrorDps: 2, // raider가 미러에 주는 초당 피해
  hitFlashDur: 0.18, // 코어/미러 피격 플래시 지속 s
  shakeDur: 0.12, // 코어 피격 화면 흔들 지속 s
  shakeMag: 4, // 화면 흔들 최대 px
  raiderBumpAmp: 2, // raider 부딪힘 왕복 진폭 px
  mirrorChainMaxHops: MIRMAX, // 미러→미러 연쇄 전파 최대 hop (0=연쇄 끄기=기존 동작)
};

const S = {} as BeaconState;

function newMirror(x: number, y: number): Mirror {
  return {
    x,
    y,
    r: 15,
    refAng: rand(0, TAU),
    refHW: 0.32,
    rot: rand(0.35, 0.75) * (Math.random() < 0.5 ? 1 : -1),
    isLit: false,
    hitT: 0,
    hp: TUNE.mirrorHP,
    mhp: TUNE.mirrorHP,
  };
}
/** 장애물 1개 추가 — 코어 최소거리 + 기존 장애물·미러와 최소간격 만족까지 재추첨(상한 30회, 실패 시 마지막 값). */
function addObstacle(): void {
  const W = S.W,
    H = S.H;
  const r = rand(15, 20);
  let x = 0,
    y = 0,
    ok = false;
  for (let tries = 0; tries < 30 && !ok; tries++) {
    x = rand(W * 0.2, W * 0.8);
    y = rand(H * 0.24, H * 0.76);
    ok = dist(x, y, S.core.x, S.core.y) > S.core.r + r + TUNE.obstacleCoreGap;
    for (const o of S.obs) if (dist(x, y, o.x, o.y) <= o.r + r + TUNE.obstacleGap) ok = false;
    for (const m of S.mirrors) if (dist(x, y, m.x, m.y) <= m.r + r + TUNE.obstacleGap) ok = false;
  }
  S.obs.push({ x, y, r });
}
function setupField(): void {
  S.obs = [];
  S.mirrors = []; // addObstacle이 미러와의 간격도 검사 → 반드시 장애물 배치 전 초기화
  for (let i = 0; i < 2; i++) addObstacle();
  S.pendingMirrors = TUNE.startMirrors;
}
function reset(W: number, H: number): void {
  S.W = W;
  S.H = H;
  S.phase = "ready";
  S.core = { x: W / 2, y: H / 2, r: 15, hp: TUNE.coreHP, hitT: 0 };
  S.aim = -Math.PI / 2;
  S.mode = "focus";
  S.en = [];
  S.parts = [];
  S.charge = 0;
  S.flashT = 0;
  setupField();
  S.pts = 0;
  S.powLv = 0;
  S.rngLv = 0;
  S.kills = 0;
  S.wave = 1;
  S.waveT = 0;
  S.spawnT = 0;
  S.spawnGap = TUNE.spawnGapStart;
  S.best = S.best || 0;
  S.ptr = null;
  S.shakeT = 0;
  S.time = 0;
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
/** 미러 직접 배치 가능 위치 — 필드 안·하단 UI 밴드 제외·코어/장애물/기존 미러와 겹침 방지. */
function canPlaceMirror(x: number, y: number): boolean {
  const r = 15; // mirror.r
  if (x < r || x > S.W - r || y < r || y > S.H - 60) return false;
  if (dist(x, y, S.core.x, S.core.y) < S.core.r + r + 12) return false;
  for (const o of S.obs) if (dist(x, y, o.x, o.y) < o.r + r + 6) return false;
  for (const m of S.mirrors) if (dist(x, y, m.x, m.y) < m.r + r + 6) return false;
  return true;
}
/** 좌표 위의 배치된 미러(반지름 hit-test) 반환, 없으면 null. */
function mirrorAt(x: number, y: number): Mirror | null {
  for (const m of S.mirrors) if (dist(x, y, m.x, m.y) <= m.r) return m;
  return null;
}
function dpsNow(): number {
  return MODES[S.mode].dps * (1 + S.powLv * 0.35);
}
function rngNow(): number {
  return mirRange(); // 메인 빔 사거리 = 미러 사거리(단일 소스). mode는 폭(HW)만 조절, 사거리 동일.
}
function mirRange(): number {
  return Math.max(S.W, S.H) * TUNE.rangeBase * (1 + S.rngLv * 0.15);
}
function spawnEnemy(): void {
  const a = rand(0, TAU);
  const R = Math.max(S.W, S.H) * 0.62;
  const raider = Math.random() < TUNE.raiderSpawnBase + S.wave * TUNE.raiderSpawnRamp;
  const um = !raider && Math.random() < TUNE.umSpawnBase + S.wave * TUNE.umSpawnRamp;
  const hp = raider ? TUNE.raiderHP : um ? TUNE.umHP : 3;
  S.en.push({
    x: S.core.x + Math.cos(a) * R,
    y: S.core.y + Math.sin(a) * R,
    r: 10,
    hp,
    mhp: hp,
    um,
    raider,
    lit: 0,
    contact: false,
    bx: 0,
    by: 0,
  });
}
function flash(): void {
  if (S.charge < 1) return;
  S.charge = 0;
  S.flashT = 0.42;
  for (const e of S.en) {
    e.hp -= e.um ? TUNE.umFlashDmg : 3.6;
    burst(e.x, e.y, "#fff", 5);
    if (e.hp <= 0) {
      S.kills++;
      S.pts++;
    }
  }
  blip(700, 0.2, "sine", 0.05);
}
function mirCost(): number {
  return 12 + (S.mirrors.length + S.pendingMirrors) * 8; // 배치+대기 합산 기준(원래 비용 진행 보존)
}
function powCost(): number {
  return 10 + S.powLv * 8;
}
function rngCost(): number {
  return 10 + S.rngLv * 8;
}
function buy(i: number): void {
  if (i === 2) {
    // +MIRROR: 즉시 배치가 아니라 "배치 대기"로. 상한은 배치+대기 합산.
    if (S.mirrors.length + S.pendingMirrors < MIRMAX && S.pts >= mirCost()) {
      S.pts -= mirCost();
      S.pendingMirrors++;
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
  // 피격 연출 타이머(화면 흔들·코어 플래시)는 phase 무관 감소 — over 화면에서 얼어붙어 계속 흔들리지 않도록.
  S.shakeT = Math.max(0, S.shakeT - dt);
  S.core.hitT = Math.max(0, S.core.hitT - dt);
  if (S.phase !== "play") return;
  S.flashT = Math.max(0, S.flashT - dt);
  S.time += dt;
  const M = MODES[S.mode];
  const rng = rngNow();
  S.waveT += dt;
  if (S.waveT > TUNE.waveInterval) {
    S.waveT = 0;
    S.wave++;
    S.spawnGap = Math.max(TUNE.spawnGapFloor, TUNE.spawnGapStart - S.wave * TUNE.spawnGapDecay);
    if (S.wave % TUNE.obstacleWaveInterval === 0 && S.obs.length < TUNE.obstacleMax) addObstacle();
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
    m.hitT = Math.max(0, m.hitT - dt);
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
  let dmgThisFrame = 0; // 이번 프레임 빔+반사가 "적"에게 실제로 준 데미지 총합 (FLASH 충전용)
  const mr = mirRange();
  const dps = dpsNow();
  for (const e of S.en) {
    if (e.hp <= 0) continue;
    e.contact = false; // 매 프레임 초기화 — 이번 프레임 미러 접촉 시에만 true
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
      const dmg = dps * (e.um ? TUNE.umBeamMult : 1) * dt;
      dmgThisFrame += Math.min(dmg, e.hp); // 실제로 깎인 만큼만 (오버킬 제외)
      e.hp -= dmg;
      if (e.hp <= 0) {
        S.kills++;
        S.pts++;
        burst(e.x, e.y, AC, 7);
        continue;
      }
    }
    // 타겟: raider는 가장 가까운 배치 미러(없으면 코어), 그 외엔 코어.
    let tgtMirror: Mirror | null = null;
    if (e.raider && S.mirrors.length > 0) {
      let best = Infinity;
      for (const m of S.mirrors) {
        const dd = dist(e.x, e.y, m.x, m.y);
        if (dd < best) {
          best = dd;
          tgtMirror = m;
        }
      }
    }
    const tx = tgtMirror ? tgtMirror.x : S.core.x;
    const ty = tgtMirror ? tgtMirror.y : S.core.y;
    // move toward target with obstacle avoidance (타겟 미러는 회피 대상에서 제외).
    let ddx = tx - e.x,
      ddy = ty - e.y;
    const dl = Math.hypot(ddx, ddy) || 1;
    ddx /= dl;
    ddy /= dl;
    for (const o of blockers(tgtMirror)) {
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
    if (tgtMirror) {
      // 미러 가장자리에서 부딪힘(파고듦 방지): standoff 밖으로 클램프, 접촉 중에만 데미지.
      const standoff = tgtMirror.r + e.r;
      let nx = e.x - tgtMirror.x,
        ny = e.y - tgtMirror.y;
      let nd = Math.hypot(nx, ny);
      if (nd < standoff) {
        if (nd < 0.001) {
          // 중심 겹침 fallback: 진입 반대 방향으로 밀어냄
          nx = -ddx;
          ny = -ddy;
          nd = Math.hypot(nx, ny) || 1;
        }
        e.x = tgtMirror.x + (nx / nd) * standoff;
        e.y = tgtMirror.y + (ny / nd) * standoff;
        tgtMirror.hp -= TUNE.raiderMirrorDps * dt; // 미러 파괴는 루프 후 일괄 처리
        tgtMirror.hitT = TUNE.hitFlashDur;
        e.contact = true;
        e.bx = -(nx / nd); // 미러 방향 단위벡터(부딪힘 연출용)
        e.by = -(ny / nd);
      }
    } else if (dist(e.x, e.y, S.core.x, S.core.y) < S.core.r + e.r) {
      e.hp = 0;
      S.core.hp -= TUNE.contactDamage;
      S.core.hitT = TUNE.hitFlashDur;
      S.shakeT = TUNE.shakeDur;
      burst(e.x, e.y, "#fff", 6);
      blip(90, 0.12, "sawtooth", 0.045);
    }
  }
  // FLASH 충전: 적에게 실제로 준 데미지에만 연동(허공/미러만 훑으면 0 → 스핀 악용 차단).
  S.charge = Math.min(1, S.charge + dmgThisFrame * TUNE.flashChargePerDmg);
  S.en = S.en.filter((e) => e.hp > 0);
  // 미러 파괴: hp 소진 미러 제거(슬롯 반환 → 배치+대기 상한 자동 회복). 우클릭 환급과 달리 pending 미증가.
  for (const m of S.mirrors) {
    if (m.hp <= 0) {
      burst(m.x, m.y, "#7dd3fc", 8);
      blip(200, 0.15, "sawtooth", 0.05);
    }
  }
  S.mirrors = S.mirrors.filter((m) => m.hp > 0);
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
  // 화면 흔들(코어 피격) — 배경 채운 뒤부터 감싸 가장자리 아티팩트 방지.
  const shaking = S.shakeT > 0;
  if (shaking) {
    const s = TUNE.shakeMag * (S.shakeT / TUNE.shakeDur);
    ctx.save();
    ctx.translate((Math.random() - 0.5) * 2 * s, (Math.random() - 0.5) * 2 * s);
  }
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
  const bump = Math.sin(S.time * 18) * TUNE.raiderBumpAmp; // 접촉 raider 부딪힘 위상
  for (const e of S.en) {
    const L = e.lit > 0.1;
    let col: string;
    if (e.raider) col = L ? "#fdba74" : "#fb923c";
    else if (e.um) col = L ? "#c4b5fd" : "#3a3358";
    else col = L ? "#fff7cc" : "#3a4456";
    const ex = e.contact ? e.x + e.bx * bump : e.x;
    const ey = e.contact ? e.y + e.by * bump : e.y;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(ex, ey, e.r, 0, TAU);
    ctx.fill();
    if (L) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(ex - e.r, ey - e.r - 5, e.r * 2, 3);
      ctx.fillStyle = e.um ? "#a78bfa" : "#fde047";
      ctx.fillRect(ex - e.r, ey - e.r - 5, e.r * 2 * clamp(e.hp / e.mhp, 0, 1), 3);
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
    const mhj = m.hitT > 0 ? m.hitT / TUNE.hitFlashDur : 0;
    const mx = m.x + (mhj ? (Math.random() - 0.5) * 4 * mhj : 0);
    const my = m.y + (mhj ? (Math.random() - 0.5) * 4 * mhj : 0);
    ctx.fillStyle = "#1e3a5f";
    ctx.beginPath();
    ctx.arc(mx, my, m.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(m.refAng) * m.r, my + Math.sin(m.refAng) * m.r);
    ctx.stroke();
    if (mhj) {
      ctx.strokeStyle = "rgba(255,90,110," + mhj + ")"; // 피격 빨간 링(저체력 상시색과 구분되는 순간 플래시)
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(mx, my, m.r + 3, 0, TAU);
      ctx.stroke();
    }
    if (m.hp < m.mhp) {
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.fillRect(mx - m.r, my - m.r - 6, m.r * 2, 3);
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(mx - m.r, my - m.r - 6, m.r * 2 * clamp(m.hp / m.mhp, 0, 1), 3);
    }
  }
  const chj = S.core.hitT > 0 ? S.core.hitT / TUNE.hitFlashDur : 0;
  const ccx = cx + (chj ? (Math.random() - 0.5) * 4 * chj : 0);
  const ccy = cy + (chj ? (Math.random() - 0.5) * 4 * chj : 0);
  ctx.save();
  ctx.shadowColor = AC;
  ctx.shadowBlur = 18;
  ctx.fillStyle = S.core.hp > 30 ? AC : "#ff5e7e";
  ctx.beginPath();
  ctx.arc(ccx, ccy, S.core.r, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (chj) {
    ctx.strokeStyle = "rgba(255,90,110," + chj + ")"; // 피격 순간 밝은 빨간 링(저체력 상시빨강과 구분)
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ccx, ccy, S.core.r + 4, 0, TAU);
    ctx.stroke();
  }
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
  // 배치 대기 중이면: 안내 문구 + 커서 위치 고스트 미러(유효=파랑, 무효=빨강).
  if (S.phase === "play" && S.pendingMirrors > 0) {
    ctext(ctx, "Tap to place mirror (" + S.pendingMirrors + " left)", W / 2, 40, 12, "#7dd3fc", 700);
    if (S.ptr) {
      const okPlace = canPlaceMirror(S.ptr.x, S.ptr.y);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = okPlace ? "#1e3a5f" : "#5f1e2a";
      ctx.beginPath();
      ctx.arc(S.ptr.x, S.ptr.y, 15, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = okPlace ? "#7dd3fc" : "#ff5e7e";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
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
    S.mirrors.length + S.pendingMirrors >= MIRMAX ? "MIRROR MAX" : "+MIRROR " + mirCost(),
    S.pts >= mirCost() && S.mirrors.length + S.pendingMirrors < MIRMAX,
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
  if (shaking) ctx.restore();
}
function onDown(x: number, y: number, button?: number): void {
  if (S.phase !== "play") {
    if (S.phase !== "ready") reset(S.W, S.H);
    S.phase = "play";
    return;
  }
  // 우클릭: 미러 위면 제거+환급(pending++, 재배치용), 아니면 무시.
  if (button === 2) {
    const m = mirrorAt(x, y);
    if (m) {
      S.mirrors = S.mirrors.filter((mm) => mm !== m);
      S.pendingMirrors++;
      blip(300, 0.08, "square", 0.04);
    }
    return;
  }
  // 좌클릭 우선순위: ① 하단 버튼 → ② 배치(대기 있으면) → ③ 미러 회전반전 → ④ 빔 조준.
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
  if (S.pendingMirrors > 0) {
    if (canPlaceMirror(x, y)) {
      S.mirrors.push(newMirror(x, y));
      S.pendingMirrors--;
      blip(620, 0.1, "triangle", 0.04);
    }
    return; // 배치 모드에선 무효 자리여도 조준하지 않음
  }
  const m = mirrorAt(x, y);
  if (m) {
    m.rot *= -1; // 좌클릭으로 미러 회전 방향 반전
    blip(440, 0.06, "square", 0.03);
    return;
  }
  S.aim = Math.atan2(y - S.core.y, x - S.core.x);
}
function onMove(x: number, y: number): void {
  if (S.phase !== "play") return;
  S.ptr = { x, y }; // 고스트 미리보기 좌표 (wantsMove:true라 버튼 없이도 들어옴)
  if (S.pendingMirrors > 0) return; // 배치 모드: 빔 조준 잠금
  S.aim = Math.atan2(y - S.core.y, x - S.core.x);
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
