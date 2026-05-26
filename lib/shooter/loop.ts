/**
 * 게임 루프 — update / render 분리 + rAF orchestrator.
 *
 * 상태 모델:
 *   - GameState는 mutable ref가 owner (React state 아님).
 *   - 매 rAF tick: 누적 dt를 STEP_MS 단위로 fixed step update → 1회 render.
 *   - HUD는 점수/생명/status diff 시에만 onHudChange 콜백.
 *
 * 투사체/적/픽업 배열은 in-place mutation 허용 — alive 필터링은 한 step의 끝에서 한 번만.
 */

import { aabbHits } from "./collision";
import { ENEMIES } from "./data/enemies";
import {
  PICKUP_DEFS,
  PICKUP_DROP_RATE,
  PICKUP_FALL_SPEED,
  POWER_DURATION_MS,
  SCORE_BONUS,
  SHIELD_DURATION_MS,
  pickRandomKind,
} from "./data/pickups";
import { WEAPONS } from "./data/weapons";
import { INITIAL_WAVE_ID } from "./data/waves";
import { tickSpawn } from "./spawn";
import {
  INITIAL_LIVES,
  LOGICAL_H,
  LOGICAL_W,
  MAX_LIVES,
  MAX_STEPS_PER_TICK,
  PLAYER_INVULNERABLE_MS,
  PLAYER_MIN_Y_RATIO,
  STEP_MS,
  type EnemyEntity,
  type GameState,
  type HudSnapshot,
  type Intent,
  type PickupEntity,
  type PickupKind,
  type PlayerState,
  type ProjectileEntity,
  type ProjectilePattern,
} from "./types";
import { drawVisual } from "./visual/render-visual";
import type { VisualAssets } from "./visual/raster";

/** 플레이어 이동 속도 (px/sec). 가로/세로 동일. */
const PLAYER_SPEED = 280;

/** 플레이어 초기 위치 — 하단 중앙. */
const PLAYER_START_X = LOGICAL_W / 2;
const PLAYER_START_Y = LOGICAL_H - 60;

/** 플레이어 y 이동 범위 — 위는 적 spawn 영역 침범 방지. */
const PLAYER_MIN_Y = LOGICAL_H * PLAYER_MIN_Y_RATIO;
const PLAYER_MAX_Y = LOGICAL_H - 30;

/** 적이 이 y를 넘으면 사라지고 플레이어가 생명 1 잃음. */
const ENEMY_DESPAWN_Y = LOGICAL_H + 40;

/** 투사체가 이 y 범위 벗어나면 제거. */
const PROJECTILE_DESPAWN_Y_TOP = -20;
const PROJECTILE_DESPAWN_Y_BOTTOM = LOGICAL_H + 20;

/** 픽업이 화면 아래로 빠지면 despawn (놓침). */
const PICKUP_DESPAWN_Y = LOGICAL_H + 30;

/** rapid-fire 활성 시 cooldown 분배율 (× factor). */
const RAPID_FIRE_FACTOR = 0.35;

/** multi-shot spread 각도 (각 ±). */
const MULTI_SHOT_SPREAD_DEG = 14;

export function makeInitialState(): GameState {
  const weapon = WEAPONS.pulse;
  const player: PlayerState = {
    id: "player",
    pos: { x: PLAYER_START_X, y: PLAYER_START_Y },
    vel: { x: 0, y: 0 },
    hitbox: { w: 24, h: 24 },
    visual: { kind: "sprite", spriteId: "player-1", width: 48, height: 48 },
    alive: true,
    weapon,
    lastFireMs: -Infinity,
    invulnerableUntilMs: 0,
    rapidFireUntilMs: 0,
    multiShotUntilMs: 0,
  };
  return {
    status: "playing",
    tick: 0,
    elapsedMs: 0,
    player,
    enemies: [],
    projectiles: [],
    pickups: [],
    score: 0,
    lives: INITIAL_LIVES,
    wave: {
      defId: INITIAL_WAVE_ID,
      sequenceIndex: 0,
      loopCount: 0,
      startMs: 0,
      spawnedCount: 0,
    },
    nextEntityId: 1,
  };
}

export function update(state: GameState, intent: Intent, dtMs: number): GameState {
  if (state.status !== "playing") return state;

  const dtSec = dtMs / 1000;
  state.tick += 1;
  state.elapsedMs += dtMs;

  // --- 플레이어 이동 (4방향) ---
  let vx = 0;
  let vy = 0;
  if (intent.moveLeft) vx -= PLAYER_SPEED;
  if (intent.moveRight) vx += PLAYER_SPEED;
  if (intent.moveUp) vy -= PLAYER_SPEED;
  if (intent.moveDown) vy += PLAYER_SPEED;
  // 사선 normalize — 사선이 더 빨라지지 않게.
  if (vx !== 0 && vy !== 0) {
    const inv = 1 / Math.SQRT2;
    vx *= inv;
    vy *= inv;
  }
  state.player.vel.x = vx;
  state.player.vel.y = vy;
  state.player.pos.x += vx * dtSec;
  state.player.pos.y += vy * dtSec;
  // 경계 clamp (entity 중심 기준).
  const halfW = state.player.hitbox.w / 2;
  if (state.player.pos.x < halfW) state.player.pos.x = halfW;
  if (state.player.pos.x > LOGICAL_W - halfW) state.player.pos.x = LOGICAL_W - halfW;
  if (state.player.pos.y < PLAYER_MIN_Y) state.player.pos.y = PLAYER_MIN_Y;
  if (state.player.pos.y > PLAYER_MAX_Y) state.player.pos.y = PLAYER_MAX_Y;

  // --- 플레이어 발사 (intent.fire + cooldown, rapid-fire/multi-shot 적용) ---
  if (intent.fire) {
    const w = state.player.weapon;
    const rapid = state.elapsedMs < state.player.rapidFireUntilMs;
    const cooldown = rapid ? w.cooldownMs * RAPID_FIRE_FACTOR : w.cooldownMs;
    if (state.elapsedMs - state.player.lastFireMs >= cooldown) {
      state.player.lastFireMs = state.elapsedMs;
      const multi = state.elapsedMs < state.player.multiShotUntilMs;
      const px = state.player.pos.x;
      const py = state.player.pos.y - 16;
      if (multi) {
        // 3-way spread — 중앙 + ±MULTI_SHOT_SPREAD_DEG
        spawnProjectiles(state, px, py, w.projectile, -1, 0);
        spawnProjectiles(state, px, py, w.projectile, -1, -MULTI_SHOT_SPREAD_DEG);
        spawnProjectiles(state, px, py, w.projectile, -1, +MULTI_SHOT_SPREAD_DEG);
      } else {
        spawnProjectiles(state, px, py, w.projectile, -1, 0);
      }
    }
  }

  // --- 적 이동 (movement kind 분기) ---
  for (const e of state.enemies) {
    const def = ENEMIES[e.defId];
    if (!def) continue;
    const m = def.movement;
    switch (m.kind) {
      case "hsine": {
        const phase = ((state.elapsedMs - e.spawnedAtMs) % m.periodMs) / m.periodMs;
        e.pos.x = e.baseX + Math.sin(phase * Math.PI * 2) * m.amplitudePx;
        e.pos.y += m.descendSpeed * dtSec;
        break;
      }
      case "straight": {
        // baseX 고정, y만 증가.
        e.pos.y += m.descendSpeed * dtSec;
        break;
      }
      case "diver": {
        // 가속 → maxSpeed 도달까지. vel.y로 누적 관리 (다른 movement는 vel 미사용).
        e.vel.y = Math.min(m.maxSpeed, e.vel.y + m.accel * dtSec);
        e.pos.y += e.vel.y * dtSec;
        break;
      }
    }
    if (e.pos.y > ENEMY_DESPAWN_Y) {
      e.alive = false;
      damagePlayer(state);
    }
  }

  // --- 투사체 이동 ---
  for (const p of state.projectiles) {
    p.pos.x += p.vel.x * dtSec;
    p.pos.y += p.vel.y * dtSec;
    if (
      p.pos.y < PROJECTILE_DESPAWN_Y_TOP ||
      p.pos.y > PROJECTILE_DESPAWN_Y_BOTTOM ||
      p.pos.x < -20 ||
      p.pos.x > LOGICAL_W + 20
    ) {
      p.alive = false;
    }
  }

  // --- 픽업 이동 ---
  for (const pk of state.pickups) {
    pk.pos.y += pk.vel.y * dtSec;
    if (pk.pos.y > PICKUP_DESPAWN_Y) pk.alive = false;
  }

  // --- 충돌: 플레이어 탄 vs 적 ---
  for (const p of state.projectiles) {
    if (!p.alive || p.ownerSide !== "player") continue;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (aabbHits(p, e)) {
        e.hp -= p.damage;
        p.alive = false;
        if (e.hp <= 0) {
          e.alive = false;
          const def = ENEMIES[e.defId];
          if (def) state.score += def.scoreValue;
          maybeDropPickup(state, e);
        }
        break;
      }
    }
  }

  // --- 충돌: 적 탄 vs 플레이어 (적 발사 없음 — 자리만) ---
  if (state.player.invulnerableUntilMs <= state.elapsedMs) {
    for (const p of state.projectiles) {
      if (!p.alive || p.ownerSide !== "enemy") continue;
      if (aabbHits(p, state.player)) {
        p.alive = false;
        damagePlayer(state);
        break;
      }
    }
  }

  // --- 충돌: 적 vs 플레이어 (몸통) ---
  if (state.player.invulnerableUntilMs <= state.elapsedMs) {
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (aabbHits(e, state.player)) {
        e.alive = false;
        damagePlayer(state);
        break;
      }
    }
  }

  // --- 충돌: 픽업 vs 플레이어 (invulnerable 무관 — 아이템은 항상 먹힘) ---
  for (const pk of state.pickups) {
    if (!pk.alive) continue;
    if (aabbHits(pk, state.player)) {
      applyPickupEffect(state, pk.kind);
      pk.alive = false;
    }
  }

  // --- 사망 entity 청소 ---
  if (state.enemies.some((e) => !e.alive)) {
    state.enemies = state.enemies.filter((e) => e.alive);
  }
  if (state.projectiles.some((p) => !p.alive)) {
    state.projectiles = state.projectiles.filter((p) => p.alive);
  }
  if (state.pickups.some((pk) => !pk.alive)) {
    state.pickups = state.pickups.filter((pk) => pk.alive);
  }

  // --- 웨이브 spawn 진행 (sequence 순회) ---
  tickSpawn(state);

  return state;
}

function damagePlayer(state: GameState): void {
  state.lives -= 1;
  state.player.invulnerableUntilMs = state.elapsedMs + PLAYER_INVULNERABLE_MS;
  if (state.lives <= 0) {
    state.lives = 0;
    state.status = "gameover";
  }
}

function maybeDropPickup(state: GameState, enemy: EnemyEntity): void {
  if (Math.random() > PICKUP_DROP_RATE) return;
  const kind = pickRandomKind();
  const def = PICKUP_DEFS[kind];
  const pk: PickupEntity = {
    id: `k${state.nextEntityId++}`,
    pos: { x: enemy.pos.x, y: enemy.pos.y },
    vel: { x: 0, y: PICKUP_FALL_SPEED },
    hitbox: { ...def.hitbox },
    visual: def.visual,
    alive: true,
    kind,
    spawnedAtMs: state.elapsedMs,
  };
  state.pickups.push(pk);
}

function applyPickupEffect(state: GameState, kind: PickupKind): void {
  switch (kind) {
    case "shield":
      state.player.invulnerableUntilMs = Math.max(
        state.player.invulnerableUntilMs,
        state.elapsedMs + SHIELD_DURATION_MS,
      );
      return;
    case "rapid-fire":
      state.player.rapidFireUntilMs = Math.max(
        state.player.rapidFireUntilMs,
        state.elapsedMs + POWER_DURATION_MS,
      );
      return;
    case "multi-shot":
      state.player.multiShotUntilMs = Math.max(
        state.player.multiShotUntilMs,
        state.elapsedMs + POWER_DURATION_MS,
      );
      return;
    case "score-bonus":
      state.score += SCORE_BONUS;
      return;
    case "extra-life":
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      return;
  }
}

function spawnProjectiles(
  state: GameState,
  x: number,
  y: number,
  pattern: ProjectilePattern,
  dirY: -1 | 1,
  angleOffsetDeg: number,
): void {
  // angleOffsetDeg: 위(-y) 기준 좌(-) / 우(+) 각도. multi-shot에서 활용.
  const rad = (angleOffsetDeg * Math.PI) / 180;
  const baseSpeed = pattern.speed * dirY; // 음수 = 위로
  // 위 방향 벡터 (0, dirY)를 angle만큼 회전. vy = baseSpeed * cos, vx = -baseSpeed * sin (위 방향에서 우로 회전이 +).
  // 단, dirY=-1(위로)일 때 angle +가 시각적 오른쪽이 되려면 vx = |baseSpeed| * sin(rad).
  const speedMag = Math.abs(baseSpeed);
  const vx = speedMag * Math.sin(rad) * (dirY === -1 ? 1 : -1);
  const vy = baseSpeed * Math.cos(rad);
  for (let i = 0; i < pattern.count; i += 1) {
    const proj: ProjectileEntity = {
      id: `p${state.nextEntityId++}`,
      pos: { x, y },
      vel: { x: vx, y: vy },
      hitbox: { ...pattern.hitbox },
      visual: pattern.visual,
      alive: true,
      ownerSide: pattern.ownerSide,
      damage: pattern.damage,
    };
    state.projectiles.push(proj);
  }
}

/**
 * Render — 매 rAF tick 1회 호출. ctx는 외부에서 DPR 변환 적용 후 전달.
 * 논리 좌표 (0,0)~(LOGICAL_W, LOGICAL_H)만 사용.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  assets: VisualAssets,
): void {
  // 배경 — 깊은 자홍/남색 계열.
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // 별
  drawStarfield(ctx, state.tick);

  // 픽업 (적보다 아래 layer — 가독성)
  for (const pk of state.pickups) {
    // 살짝 깜빡임으로 주목 (1.2초 사이클)
    const pulseAlpha = 0.7 + 0.3 * Math.sin((state.elapsedMs - pk.spawnedAtMs) / 200);
    ctx.globalAlpha = pulseAlpha;
    drawVisual(ctx, pk.visual, pk.pos, assets);
    ctx.globalAlpha = 1;
  }

  // 적
  for (const e of state.enemies) {
    drawVisual(ctx, e.visual, e.pos, assets);
  }

  // 투사체
  for (const p of state.projectiles) {
    drawVisual(ctx, p.visual, p.pos, assets);
  }

  // 플레이어 — invulnerable 동안 깜빡임 (125ms 사이클).
  const inv = state.player.invulnerableUntilMs - state.elapsedMs;
  const blink = inv > 0 ? Math.floor(state.elapsedMs / 125) % 2 === 0 : true;
  if (blink) {
    drawVisual(ctx, state.player.visual, state.player.pos, assets);
  }

  // 활성 power-up 아이콘 표시 (캔버스 하단 좌측) — 작은 시각 cue
  drawActivePowerups(ctx, state);
}

function drawActivePowerups(ctx: CanvasRenderingContext2D, state: GameState): void {
  const items: { color: string; remaining: number }[] = [];
  const inv = state.player.invulnerableUntilMs - state.elapsedMs;
  if (inv > 0 && inv < SHIELD_DURATION_MS + 500) {
    items.push({ color: "#22d3ee", remaining: inv });
  }
  const rapid = state.player.rapidFireUntilMs - state.elapsedMs;
  if (rapid > 0) items.push({ color: "#facc15", remaining: rapid });
  const multi = state.player.multiShotUntilMs - state.elapsedMs;
  if (multi > 0) items.push({ color: "#c084fc", remaining: multi });
  if (items.length === 0) return;
  const barW = 36;
  const barH = 3;
  const gap = 4;
  const startX = 8;
  const startY = LOGICAL_H - 10;
  items.forEach((it, i) => {
    const y = startY - i * (barH + gap);
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(startX, y, barW, barH);
    ctx.fillStyle = it.color;
    const frac = Math.max(0, Math.min(1, it.remaining / POWER_DURATION_MS));
    ctx.fillRect(startX, y, barW * frac, barH);
  });
}

function drawStarfield(ctx: CanvasRenderingContext2D, tick: number): void {
  ctx.fillStyle = "#2a2a40";
  const cols = 12;
  const rows = 18;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const seed = (r * 31 + c * 17) % 7;
      if (seed > 2) continue;
      const x = ((c * 31 + r * 13) % LOGICAL_W);
      const y = ((r * (LOGICAL_H / rows) + tick * 0.5) % LOGICAL_H);
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }
}

export function projectHud(state: GameState, highScore: number): HudSnapshot {
  return {
    score: state.score,
    lives: state.lives,
    status: state.status,
    highScore: Math.max(highScore, state.score),
    isNewHighScore: state.score > highScore,
  };
}

function hudEquals(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.score === b.score &&
    a.lives === b.lives &&
    a.status === b.status &&
    a.highScore === b.highScore &&
    a.isNewHighScore === b.isNewHighScore
  );
}

export type GameLoopHandle = {
  stop: () => void;
  restart: () => void;
};

export type GameLoopOpts = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  getIntent: () => Intent;
  stateRef: { current: GameState };
  assets: VisualAssets;
  highScoreRef: { current: number };
  onHudChange: (snap: HudSnapshot) => void;
  onGameOver?: (finalScore: number) => void;
  /** true 반환 시 update skip (render만). */
  isPaused?: () => boolean;
};

export function startGameLoop(opts: GameLoopOpts): GameLoopHandle {
  const { ctx, getIntent, stateRef, assets, highScoreRef, onHudChange, onGameOver, isPaused } = opts;
  let rafId = 0;
  let lastTimestamp: number | null = null;
  let accumulator = 0;
  let lastHud: HudSnapshot = projectHud(stateRef.current, highScoreRef.current);
  let gameOverFired = false;
  onHudChange(lastHud);

  const tick = (ts: number) => {
    if (lastTimestamp === null) {
      lastTimestamp = ts;
      rafId = requestAnimationFrame(tick);
      return;
    }
    const dt = ts - lastTimestamp;
    lastTimestamp = ts;

    if (isPaused?.()) {
      accumulator = 0;
    } else {
      accumulator += dt;
      const intent = getIntent();
      let steps = 0;
      while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_TICK) {
        update(stateRef.current, intent, STEP_MS);
        accumulator -= STEP_MS;
        steps += 1;
      }
      if (accumulator > STEP_MS * MAX_STEPS_PER_TICK) {
        accumulator = 0;
      }
    }

    render(ctx, stateRef.current, assets);

    const snap = projectHud(stateRef.current, highScoreRef.current);
    if (!hudEquals(snap, lastHud)) {
      lastHud = snap;
      onHudChange(snap);
    }
    if (stateRef.current.status === "gameover" && !gameOverFired) {
      gameOverFired = true;
      onGameOver?.(stateRef.current.score);
    }

    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);

  return {
    stop: () => {
      if (rafId) cancelAnimationFrame(rafId);
    },
    restart: () => {
      stateRef.current = makeInitialState();
      accumulator = 0;
      lastTimestamp = null;
      gameOverFired = false;
      lastHud = projectHud(stateRef.current, highScoreRef.current);
      onHudChange(lastHud);
    },
  };
}
