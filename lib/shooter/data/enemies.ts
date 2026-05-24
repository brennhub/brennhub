import type { EnemyDef } from "../types";

/**
 * 적 데이터. MVP 2종 — ghost(빠름·약함), bug(느림·강함).
 * 둘 다 hsine 이동 (좌우 사인파 + 천천히 하강). 적 발사는 V2 (BACKLOG).
 */
export const ENEMIES: Record<string, EnemyDef> = {
  ghost: {
    id: "ghost",
    hp: 1,
    speed: 80,
    scoreValue: 100,
    hitbox: { w: 28, h: 28 },
    visual: { kind: "lucide-raster", iconId: "ghost", tint: "#a78bfa", size: 36 },
    movement: { kind: "hsine", amplitudePx: 60, periodMs: 2800, descendSpeed: 30 },
  },
  bug: {
    id: "bug",
    hp: 2,
    speed: 50,
    scoreValue: 250,
    hitbox: { w: 30, h: 30 },
    visual: { kind: "lucide-raster", iconId: "bug", tint: "#f87171", size: 38 },
    movement: { kind: "hsine", amplitudePx: 40, periodMs: 4000, descendSpeed: 20 },
  },
};
