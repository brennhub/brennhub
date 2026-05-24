/**
 * 웨이브 spawn 진행 + 같은 웨이브 무한 반복.
 *
 * 현 wave의 spawn 큐를 elapsed - startMs와 대조해 새 적 인스턴스 push.
 * 큐 소진 + 화면에 적 0이면 같은 wave 재스폰 (loopCount++, startMs 리셋).
 */

import { ENEMIES } from "./data/enemies";
import { WAVES } from "./data/waves";
import type { EnemyEntity, GameState } from "./types";

/**
 * GameState를 mutate — wave 진행 + 신규 적 push.
 * 반환값 없음 (in-place).
 */
export function tickSpawn(state: GameState): void {
  const wave = WAVES[state.wave.defId];
  if (!wave) return;

  const localMs = state.elapsedMs - state.wave.startMs;

  // 큐에서 delay 도달한 항목 push.
  while (state.wave.spawnedCount < wave.enemies.length) {
    const slot = wave.enemies[state.wave.spawnedCount];
    if (slot.delayMs > localMs) break;
    const def = ENEMIES[slot.defId];
    if (def) {
      const entity: EnemyEntity = {
        id: `e${state.nextEntityId++}`,
        pos: { x: slot.spawnAt.x, y: slot.spawnAt.y },
        vel: { x: 0, y: 0 },
        hitbox: { ...def.hitbox },
        visual: def.visual,
        alive: true,
        defId: def.id,
        hp: def.hp,
        lastFireMs: 0,
        spawnedAtMs: state.elapsedMs,
        baseX: slot.spawnAt.x,
      };
      state.enemies.push(entity);
    }
    state.wave.spawnedCount += 1;
  }

  // 큐 소진 + 화면 클리어 → 같은 웨이브 재스폰.
  if (
    state.wave.spawnedCount >= wave.enemies.length &&
    state.enemies.length === 0
  ) {
    state.wave.loopCount += 1;
    state.wave.startMs = state.elapsedMs;
    state.wave.spawnedCount = 0;
  }
}
