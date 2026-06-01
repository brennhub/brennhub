import { LOGICAL_W } from "../types";
import type { WaveDef } from "../types";

/**
 * 웨이브 정의 — 상업 슈팅 클래식 패턴 5종. WAVE_SEQUENCE 순회로 시퀀스 진행,
 * 마지막 wave 클리어 시 sequenceIndex 0으로 wrap + loopCount++ (무한 반복).
 *
 * 시각적 형태(V·zigzag·dive 등)는 spawn 위치/시간 + enemy movement 조합으로 표현:
 * - "line"   : 일직선 ghost (hsine 좌우 흔들림)
 * - "v"      : ∨자 bug (y 차이 + 동시 spawn → 들어올 때 V 형태 + straight 하강)
 * - "zigzag" : ghost 좌우 번갈아 spawn (hsine)
 * - "dive"   : diver 5마리 빠른 다이브 → bug 추격
 * - "swarm"  : 다종 mixed 빠른 연속 spawn
 */

const TOP_Y = -30;

function evenX(i: number, n: number, margin = 50): number {
  const usable = LOGICAL_W - margin * 2;
  return margin + (i / Math.max(1, n - 1)) * usable;
}

// ─── wave-line ────────────────────────────────────────────────
// ghost 6마리 가로 정렬, 0.5초 간격 spawn (좌→우 sweep)
const WAVE_LINE: WaveDef = {
  id: "line",
  enemies: Array.from({ length: 6 }, (_, i) => ({
    defId: "ghost",
    spawnAt: { x: evenX(i, 6), y: TOP_Y },
    delayMs: 500 + i * 500,
  })),
};

// ─── wave-v ───────────────────────────────────────────────────
// bug 7마리 ∨ 형태. 가운데가 가장 아래(앞장), 양 끝이 위.
// 전부 거의 동시 spawn(stagger 80ms) + y 차이로 V 시각.
const WAVE_V: WaveDef = {
  id: "v",
  enemies: Array.from({ length: 7 }, (_, i) => {
    const dist = Math.abs(i - 3); // center = 3
    return {
      defId: "bug",
      spawnAt: { x: evenX(i, 7), y: TOP_Y - dist * 28 },
      delayMs: 800 + i * 80,
    };
  }),
};

// ─── wave-zigzag ──────────────────────────────────────────────
// ghost 8마리, x 위치 좌↔우 번갈아. hsine 사인파라 자연스러운 zigzag 보강.
const WAVE_ZIGZAG: WaveDef = {
  id: "zigzag",
  enemies: Array.from({ length: 8 }, (_, i) => {
    // 0→0, 1→7, 2→1, 3→6, 4→2, 5→5, 6→3, 7→4 (좌→우→좌→우...)
    const half = Math.floor(i / 2);
    const xIdx = i % 2 === 0 ? half : 7 - half;
    return {
      defId: "ghost",
      spawnAt: { x: evenX(xIdx, 8, 40), y: TOP_Y },
      delayMs: 500 + i * 350,
    };
  }),
};

// ─── wave-dive ────────────────────────────────────────────────
// diver 5마리 빠른 다이브 (불규칙 x) → 약간 쉬고 bug 4마리 horizontal.
const WAVE_DIVE: WaveDef = {
  id: "dive",
  enemies: [
    ...Array.from({ length: 5 }, (_, i) => ({
      defId: "diver",
      // 화면 폭에 흩어진 x — 패턴화하지 않게 의도적으로 흩뿌림.
      spawnAt: { x: evenX([2, 0, 4, 1, 3][i], 5), y: TOP_Y },
      delayMs: 400 + i * 220,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      defId: "bug",
      spawnAt: { x: evenX(i, 4), y: TOP_Y },
      delayMs: 2400 + i * 300,
    })),
  ],
};

// ─── wave-swarm ───────────────────────────────────────────────
// 12마리 mixed (ghost x6 + bug x4 + diver x2). 0.25초 간격 빠른 연속 spawn.
const WAVE_SWARM: WaveDef = {
  id: "swarm",
  enemies: (() => {
    const order: string[] = [
      "ghost", "ghost", "bug", "ghost", "diver", "bug",
      "ghost", "bug", "ghost", "diver", "bug", "ghost",
    ];
    return order.map((defId, i) => ({
      defId,
      spawnAt: { x: evenX(i % 6, 6, 40), y: TOP_Y },
      delayMs: 400 + i * 250,
    }));
  })(),
};

// ─── wave-funnel ──────────────────────────────────────────────
// drifter 양쪽에서 안쪽으로 모이는 형태. 좌측 5(rt) + 우측 5(lt).
// y 차이로 stagger 시각.
const WAVE_FUNNEL: WaveDef = {
  id: "funnel",
  enemies: [
    ...Array.from({ length: 5 }, (_, i) => ({
      defId: "drifter-rt",
      spawnAt: { x: 30, y: TOP_Y - i * 22 },
      delayMs: 500 + i * 280,
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      defId: "drifter-lt",
      spawnAt: { x: LOGICAL_W - 30, y: TOP_Y - i * 22 },
      delayMs: 500 + i * 280,
    })),
  ],
};

// ─── wave-wall ────────────────────────────────────────────────
// ghost 10마리 동시 spawn 가로 완벽 정렬. 빠른 straight 하강 — 벽.
// hsine 대신 별도 ghost movement는 한 종이라 wall엔 빠른 bug straight 차용.
// (대신 동시 spawn + 완전 정렬로 wall 시각)
const WAVE_WALL: WaveDef = {
  id: "wall",
  enemies: Array.from({ length: 10 }, (_, i) => ({
    defId: "bug",
    spawnAt: { x: evenX(i, 10, 25), y: TOP_Y },
    delayMs: 600 + i * 50, // 거의 동시 (50ms stagger)
  })),
};

// ─── wave-cross ───────────────────────────────────────────────
// 좌상→우하 4 (drifter-rt, 좌 spawn) + 우상→좌하 4 (drifter-lt, 우 spawn).
// 화면 가운데서 X자 교차.
const WAVE_CROSS: WaveDef = {
  id: "cross",
  enemies: [
    ...Array.from({ length: 4 }, (_, i) => ({
      defId: "drifter-rt",
      spawnAt: { x: 40, y: TOP_Y - i * 30 },
      delayMs: 500 + i * 250,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      defId: "drifter-lt",
      spawnAt: { x: LOGICAL_W - 40, y: TOP_Y - i * 30 },
      delayMs: 500 + i * 250,
    })),
  ],
};

// ─── wave-rain ────────────────────────────────────────────────
// 14마리 mixed 무작위 x, 빠른 spawn rate. 결정론 위해 hardcoded 순열.
const WAVE_RAIN: WaveDef = {
  id: "rain",
  enemies: (() => {
    // hardcoded x ratios + defs — 결정론, random 없음.
    const order: { defId: string; xRatio: number }[] = [
      { defId: "ghost", xRatio: 0.15 },
      { defId: "diver", xRatio: 0.85 },
      { defId: "ghost", xRatio: 0.55 },
      { defId: "bug", xRatio: 0.3 },
      { defId: "ghost", xRatio: 0.7 },
      { defId: "diver", xRatio: 0.2 },
      { defId: "bug", xRatio: 0.45 },
      { defId: "ghost", xRatio: 0.9 },
      { defId: "ghost", xRatio: 0.1 },
      { defId: "diver", xRatio: 0.6 },
      { defId: "bug", xRatio: 0.75 },
      { defId: "ghost", xRatio: 0.35 },
      { defId: "diver", xRatio: 0.5 },
      { defId: "bug", xRatio: 0.25 },
    ];
    return order.map((o, i) => ({
      defId: o.defId,
      spawnAt: { x: LOGICAL_W * o.xRatio, y: TOP_Y },
      delayMs: 400 + i * 180,
    }));
  })(),
};

// ─── wave-boss-rush ───────────────────────────────────────────
// 가운데 bug cluster (4) 천천히 + diver 5마리 측면 dive + 마지막 bug 3 wall.
const WAVE_BOSS_RUSH: WaveDef = {
  id: "boss-rush",
  enemies: [
    // 가운데 bug cluster 4
    ...Array.from({ length: 4 }, (_, i) => ({
      defId: "bug",
      spawnAt: { x: LOGICAL_W / 2 + (i - 1.5) * 28, y: TOP_Y - 20 },
      delayMs: 400 + i * 100,
    })),
    // 측면 diver 5 (좌·우 번갈아)
    ...Array.from({ length: 5 }, (_, i) => ({
      defId: "diver",
      spawnAt: {
        x: i % 2 === 0 ? 40 : LOGICAL_W - 40,
        y: TOP_Y,
      },
      delayMs: 1400 + i * 400,
    })),
    // 마무리 bug wall 3
    ...Array.from({ length: 3 }, (_, i) => ({
      defId: "bug",
      spawnAt: { x: evenX(i, 3, 50), y: TOP_Y },
      delayMs: 4500 + i * 100,
    })),
  ],
};

export const WAVES: Record<string, WaveDef> = {
  line: WAVE_LINE,
  v: WAVE_V,
  zigzag: WAVE_ZIGZAG,
  dive: WAVE_DIVE,
  swarm: WAVE_SWARM,
  funnel: WAVE_FUNNEL,
  wall: WAVE_WALL,
  cross: WAVE_CROSS,
  rain: WAVE_RAIN,
  "boss-rush": WAVE_BOSS_RUSH,
};

/**
 * 진행 순서 — 클리어 시마다 다음. 마지막 클리어 시 wrap → loopCount++.
 * 난이도(쉬움/중간/어려움)는 DIFFICULTY_MODS로 직교 적용 (별도).
 * 10 wave 시퀀스 — 단조롭지 않게 형태·속도 변주 섞음.
 */
export const WAVE_SEQUENCE = [
  "line",
  "v",
  "zigzag",
  "dive",
  "funnel",
  "swarm",
  "wall",
  "cross",
  "rain",
  "boss-rush",
] as const;

export const INITIAL_WAVE_ID = WAVE_SEQUENCE[0];
