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

export const WAVES: Record<string, WaveDef> = {
  line: WAVE_LINE,
  v: WAVE_V,
  zigzag: WAVE_ZIGZAG,
  dive: WAVE_DIVE,
  swarm: WAVE_SWARM,
};

/**
 * 진행 순서 — 클리어 시마다 다음. 마지막(swarm) 클리어 시 wrap → loopCount++.
 * 난이도 증가는 BACKLOG (loopCount 기반 속도/HP 보정).
 */
export const WAVE_SEQUENCE = ["line", "v", "zigzag", "dive", "swarm"] as const;

export const INITIAL_WAVE_ID = WAVE_SEQUENCE[0];
