import type { WeaponDef } from "../types";

/**
 * 무기 데이터 — 향후 파츠 시스템에서 `playerWeapon = WEAPONS[loadout.weapon]`로 교체.
 * MVP는 pulse 1종.
 */
export const WEAPONS: Record<string, WeaponDef> = {
  pulse: {
    id: "pulse",
    cooldownMs: 220,
    projectile: {
      kind: "straight",
      count: 1,
      speed: 420,
      damage: 1,
      ownerSide: "player",
      hitbox: { w: 4, h: 12 },
      visual: { kind: "primitive", shape: "rect", color: "#fde047", size: 6 },
    },
  },
};
