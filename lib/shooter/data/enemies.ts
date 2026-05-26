import type { EnemyDef } from "../types";

/**
 * 적 데이터. movement는 EnemyMovement union — kind별로 loop.ts에서 분기.
 *
 * MVP 3종:
 * - ghost: 좌우 사인파, 약함 (hsine)
 * - bug: 직선 하강, 강함 (straight)
 * - diver: 빠른 다이브 (가속 → maxSpeed), 약함
 */
export const ENEMIES: Record<string, EnemyDef> = {
  ghost: {
    id: "ghost",
    hp: 1,
    speed: 80,
    scoreValue: 100,
    hitbox: { w: 28, h: 28 },
    visual: { kind: "lucide-raster", iconId: "ghost", tint: "#a78bfa", size: 36 },
    movement: { kind: "hsine", amplitudePx: 60, periodMs: 2800, descendSpeed: 40 },
  },
  bug: {
    id: "bug",
    hp: 2,
    speed: 50,
    scoreValue: 250,
    hitbox: { w: 30, h: 30 },
    visual: { kind: "lucide-raster", iconId: "bug", tint: "#f87171", size: 38 },
    movement: { kind: "straight", descendSpeed: 55 },
  },
  diver: {
    id: "diver",
    hp: 1,
    speed: 200,
    scoreValue: 200,
    hitbox: { w: 26, h: 26 },
    visual: { kind: "lucide-raster", iconId: "bug", tint: "#fb923c", size: 34 },
    movement: { kind: "diver", accel: 220, maxSpeed: 280 },
  },
};
