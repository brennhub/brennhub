/**
 * AABB 충돌 — brute-force. MVP 규모(투사체 ~50 × 적 ~20 = 1000 pairs/frame)는
 * quadtree 같은 공간 인덱스 없이 충분. 도그마: 미리 최적화 X.
 */

import type { Entity } from "./types";

/** 두 entity의 AABB가 겹치는지. pos는 중심 좌표. */
export function aabbHits(a: Entity, b: Entity): boolean {
  const dx = Math.abs(a.pos.x - b.pos.x);
  const dy = Math.abs(a.pos.y - b.pos.y);
  return dx < (a.hitbox.w + b.hitbox.w) / 2 && dy < (a.hitbox.h + b.hitbox.h) / 2;
}
