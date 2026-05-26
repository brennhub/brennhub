import type { Hitbox, PickupKind, Visual } from "../types";

/**
 * 아이템 정의. 적 격추 시 일정 확률(PICKUP_DROP_RATE)로 spawn,
 * 가중치(weight)로 종류 결정.
 *
 * effect는 loop.ts의 applyPickupEffect(state, kind) switch에서 처리 —
 * 함수 직렬화 안 들고 데이터는 spawn 매개변수만.
 */
export type PickupDef = {
  /** 가중치(상대값). 합산 후 비례 추첨. */
  weight: number;
  visual: Visual;
  hitbox: Hitbox;
};

export const PICKUP_DEFS: Record<PickupKind, PickupDef> = {
  shield: {
    weight: 22,
    visual: { kind: "lucide-raster", iconId: "shield", tint: "#22d3ee", size: 28 },
    hitbox: { w: 26, h: 26 },
  },
  "rapid-fire": {
    weight: 22,
    visual: { kind: "lucide-raster", iconId: "zap", tint: "#facc15", size: 28 },
    hitbox: { w: 26, h: 26 },
  },
  "multi-shot": {
    weight: 20,
    visual: { kind: "lucide-raster", iconId: "sparkles", tint: "#c084fc", size: 28 },
    hitbox: { w: 26, h: 26 },
  },
  "score-bonus": {
    weight: 26, // 가장 흔함 (즉시 효과 — 별 부담 X)
    visual: { kind: "lucide-raster", iconId: "coins", tint: "#fbbf24", size: 28 },
    hitbox: { w: 26, h: 26 },
  },
  "extra-life": {
    weight: 10, // 가장 rare
    visual: { kind: "lucide-raster", iconId: "heart", tint: "#f43f5e", size: 28 },
    hitbox: { w: 26, h: 26 },
  },
};

/** 적 격추 시 픽업 drop 확률. */
export const PICKUP_DROP_RATE = 0.15;

/** 픽업 하강 속도 (px/sec). */
export const PICKUP_FALL_SPEED = 70;

/** power-up 지속 시간 (ms). */
export const POWER_DURATION_MS = 6000;

/** shield 무적 지속 시간 (ms). */
export const SHIELD_DURATION_MS = 5000;

/** score-bonus 즉시 점수 가산. */
export const SCORE_BONUS = 500;

/**
 * 가중치 기반 랜덤 PickupKind 선택. seed 무관 (Math.random).
 */
export function pickRandomKind(): PickupKind {
  const entries = Object.entries(PICKUP_DEFS) as [PickupKind, PickupDef][];
  const total = entries.reduce((sum, [, def]) => sum + def.weight, 0);
  let r = Math.random() * total;
  for (const [kind, def] of entries) {
    r -= def.weight;
    if (r <= 0) return kind;
  }
  // 부동소수점 보정
  return entries[entries.length - 1][0];
}
