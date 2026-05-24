import { LOGICAL_W } from "../types";
import type { WaveDef } from "../types";

/**
 * 웨이브 정의. MVP는 단일 wave를 무한 반복(같은 wave 재스폰)으로 무한 게임.
 * 다중 시퀀스/난이도 곡선은 BACKLOG.
 *
 * 좌측에서 우측으로 5마리 ghost를 0.6초 간격으로 spawn한 뒤,
 * 가운데로 3마리 bug를 1.2초 간격으로 spawn.
 */

const TOP_Y = -30;

function evenX(i: number, n: number, margin = 50): number {
  const usable = LOGICAL_W - margin * 2;
  return margin + (i / Math.max(1, n - 1)) * usable;
}

export const WAVE_ALPHA: WaveDef = {
  id: "alpha",
  enemies: [
    // ghost 5마리 — 좌→우 순차
    ...Array.from({ length: 5 }, (_, i) => ({
      defId: "ghost",
      spawnAt: { x: evenX(i, 5), y: TOP_Y },
      delayMs: 400 + i * 600,
    })),
    // bug 3마리 — 가운데 모임 (1.2초 간격)
    ...Array.from({ length: 3 }, (_, i) => ({
      defId: "bug",
      spawnAt: { x: evenX(i + 1, 5), y: TOP_Y },
      delayMs: 4000 + i * 1200,
    })),
  ],
};

export const WAVES: Record<string, WaveDef> = {
  alpha: WAVE_ALPHA,
};

/** 게임 시작 wave. */
export const INITIAL_WAVE_ID = "alpha";
