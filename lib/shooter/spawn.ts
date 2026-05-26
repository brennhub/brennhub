/**
 * 웨이브 spawn 진행 + sequence 순회.
 *
 * 현 wave 큐를 elapsed - startMs와 대조해 신규 적 push. 큐 소진 + 화면 클리어 시
 * sequenceIndex++ → WAVE_SEQUENCE wrap (loopCount++) + startMs 리셋.
 */

import { ENEMIES } from "./data/enemies";
import { WAVE_SEQUENCE, WAVES } from "./data/waves";
import type { EnemyEntity, GameState } from "./types";

export function tickSpawn(state: GameState): void {
  const wave = WAVES[state.wave.defId];
  if (!wave) return;

  const localMs = state.elapsedMs - state.wave.startMs;

  // delay 도달한 enemy push.
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

  // 큐 소진 + 화면 클리어 → 다음 wave.
  if (
    state.wave.spawnedCount >= wave.enemies.length &&
    state.enemies.length === 0
  ) {
    const nextIndex = (state.wave.sequenceIndex + 1) % WAVE_SEQUENCE.length;
    // 한 바퀴 돌면 loopCount++ (난이도 증가 자리 — 현재는 시각만)
    if (nextIndex === 0) {
      state.wave.loopCount += 1;
    }
    state.wave.sequenceIndex = nextIndex;
    state.wave.defId = WAVE_SEQUENCE[nextIndex];
    state.wave.startMs = state.elapsedMs;
    state.wave.spawnedCount = 0;
  }
}
