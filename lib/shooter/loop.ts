/**
 * 게임 루프 — update / render 분리 + rAF orchestrator.
 *
 * 상태 모델:
 *   - GameState는 mutable ref가 owner (React state 아님).
 *   - 매 rAF tick: 누적 dt를 STEP_MS 단위로 fixed step update → 1회 render.
 *   - HUD는 점수/생명/status diff 시에만 onHudChange 콜백.
 *
 * 투사체 배열은 in-place mutation 허용 — alive 필터링은 한 step의 끝에서 한 번만.
 */

import { aabbHits } from "./collision";
import { ENEMIES } from "./data/enemies";
import { WEAPONS } from "./data/weapons";
import { INITIAL_WAVE_ID } from "./data/waves";
import { tickSpawn } from "./spawn";
import {
  INITIAL_LIVES,
  LOGICAL_H,
  LOGICAL_W,
  MAX_STEPS_PER_TICK,
  PLAYER_INVULNERABLE_MS,
  STEP_MS,
  type GameState,
  type HudSnapshot,
  type Intent,
  type PlayerState,
  type ProjectileEntity,
} from "./types";
import { drawVisual } from "./visual/render-visual";
import type { VisualAssets } from "./visual/raster";

/** 플레이어 좌우 이동 속도 (px/sec). */
const PLAYER_SPEED = 280;

/** 플레이어 초기 위치 — 하단 중앙. */
const PLAYER_START_X = LOGICAL_W / 2;
const PLAYER_START_Y = LOGICAL_H - 60;

/** 적이 이 y를 넘으면 (화면 하단으로 빠지면) 사라지고 플레이어가 생명 1 잃음. */
const ENEMY_DESPAWN_Y = LOGICAL_H + 40;

/** 투사체가 이 y 위로 빠지면 (화면 위로 사라지면) 제거. */
const PROJECTILE_DESPAWN_Y_TOP = -20;
const PROJECTILE_DESPAWN_Y_BOTTOM = LOGICAL_H + 20;

export function makeInitialState(): GameState {
  const weapon = WEAPONS.pulse;
  const player: PlayerState = {
    id: "player",
    pos: { x: PLAYER_START_X, y: PLAYER_START_Y },
    vel: { x: 0, y: 0 },
    hitbox: { w: 24, h: 24 },
    visual: { kind: "lucide-raster", iconId: "rocket", tint: "#fbbf24", size: 36 },
    alive: true,
    weapon,
    lastFireMs: -Infinity,
    invulnerableUntilMs: 0,
  };
  return {
    status: "playing",
    tick: 0,
    elapsedMs: 0,
    player,
    enemies: [],
    projectiles: [],
    score: 0,
    lives: INITIAL_LIVES,
    wave: {
      defId: INITIAL_WAVE_ID,
      loopCount: 0,
      startMs: 0,
      spawnedCount: 0,
    },
    nextEntityId: 1,
  };
}

/**
 * Fixed timestep update — 매 step STEP_MS만큼 시뮬레이션 전진.
 * state를 in-place mutate (단, MVP 규모에선 새 object 반환도 OK라 했지만
 * tight loop에서 GC 부담을 줄이려 mutation 채택. immutability 도그마 X).
 */
export function update(state: GameState, intent: Intent, dtMs: number): GameState {
  if (state.status !== "playing") return state;

  const dtSec = dtMs / 1000;
  state.tick += 1;
  state.elapsedMs += dtMs;

  // --- 플레이어 이동 ---
  let vx = 0;
  if (intent.moveLeft) vx -= PLAYER_SPEED;
  if (intent.moveRight) vx += PLAYER_SPEED;
  state.player.vel.x = vx;
  state.player.pos.x += vx * dtSec;
  // 캔버스 좌우 경계 clamp (entity 중심 기준).
  const halfW = state.player.hitbox.w / 2;
  if (state.player.pos.x < halfW) state.player.pos.x = halfW;
  if (state.player.pos.x > LOGICAL_W - halfW) state.player.pos.x = LOGICAL_W - halfW;

  // --- 플레이어 발사 (intent.fire + cooldown) ---
  if (intent.fire) {
    const w = state.player.weapon;
    if (state.elapsedMs - state.player.lastFireMs >= w.cooldownMs) {
      state.player.lastFireMs = state.elapsedMs;
      spawnProjectiles(state, state.player.pos.x, state.player.pos.y - 16, w.projectile, -1);
    }
  }

  // --- 적 이동 (movement.kind === "hsine") ---
  for (const e of state.enemies) {
    const def = ENEMIES[e.defId];
    if (!def) continue;
    const m = def.movement;
    const phase = ((state.elapsedMs - e.spawnedAtMs) % m.periodMs) / m.periodMs;
    const offsetX = Math.sin(phase * Math.PI * 2) * m.amplitudePx;
    e.pos.x = e.baseX + offsetX;
    e.pos.y += m.descendSpeed * dtSec;
    if (e.pos.y > ENEMY_DESPAWN_Y) {
      e.alive = false;
      // 적이 빠져나가면 1 데미지 (생명 감소).
      damagePlayer(state);
    }
  }

  // --- 투사체 이동 ---
  for (const p of state.projectiles) {
    p.pos.x += p.vel.x * dtSec;
    p.pos.y += p.vel.y * dtSec;
    if (p.pos.y < PROJECTILE_DESPAWN_Y_TOP || p.pos.y > PROJECTILE_DESPAWN_Y_BOTTOM) {
      p.alive = false;
    }
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
        }
        break; // 한 탄은 한 적만
      }
    }
  }

  // --- 충돌: 적 탄 vs 플레이어 (MVP는 적 발사 없음, 인터페이스만) ---
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

  // --- 충돌: 적 vs 플레이어 (몸통 충돌) ---
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

  // --- 사망 entity 청소 ---
  if (state.enemies.some((e) => !e.alive)) {
    state.enemies = state.enemies.filter((e) => e.alive);
  }
  if (state.projectiles.some((p) => !p.alive)) {
    state.projectiles = state.projectiles.filter((p) => p.alive);
  }

  // --- 웨이브 spawn 진행 (같은 웨이브 무한 반복) ---
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

function spawnProjectiles(
  state: GameState,
  x: number,
  y: number,
  pattern: import("./types").ProjectilePattern,
  dirY: -1 | 1,
): void {
  // MVP: kind="straight"만 — count=1, 수직.
  // spread 분기는 인터페이스 자리로 남김 (BACKLOG).
  const speed = pattern.speed * dirY;
  for (let i = 0; i < pattern.count; i += 1) {
    const proj: ProjectileEntity = {
      id: `p${state.nextEntityId++}`,
      pos: { x, y },
      vel: { x: 0, y: speed },
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
  // 배경 — 깊은 자홍/남색 계열, 가독성 위해 dark만.
  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // 별 (시각 효과) — 시각 정적 grid, 결정론. tick 기반 약한 흐름.
  drawStarfield(ctx, state.tick);

  // 적
  for (const e of state.enemies) {
    drawVisual(ctx, e.visual, e.pos, assets);
  }

  // 투사체
  for (const p of state.projectiles) {
    drawVisual(ctx, p.visual, p.pos, assets);
  }

  // 플레이어 — invulnerable 동안 깜빡임 (250ms 사이클).
  const inv = state.player.invulnerableUntilMs - state.elapsedMs;
  const blink = inv > 0 ? Math.floor(state.elapsedMs / 125) % 2 === 0 : true;
  if (blink) {
    drawVisual(ctx, state.player.visual, state.player.pos, assets);
  }
}

/** 단순 starfield — 결정론, no random per-frame. */
function drawStarfield(ctx: CanvasRenderingContext2D, tick: number): void {
  ctx.fillStyle = "#2a2a40";
  const cols = 12;
  const rows = 18;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      // 의사 랜덤 (좌표 해시).
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
  /** 재시작 — 새 initial state로 ref 교체. */
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
  /** 게임오버 시 1회 호출 (최종 점수 저장 등). */
  onGameOver?: (finalScore: number) => void;
  /** true 반환 시 update skip (render만). 시작 전 화면 / 미래 일시정지용. */
  isPaused?: () => boolean;
};

export function startGameLoop(opts: GameLoopOpts): GameLoopHandle {
  const { ctx, getIntent, stateRef, assets, highScoreRef, onHudChange, onGameOver, isPaused } = opts;
  let rafId = 0;
  let lastTimestamp: number | null = null;
  let accumulator = 0;
  let lastHud: HudSnapshot = projectHud(stateRef.current, highScoreRef.current);
  let gameOverFired = false;
  // 즉시 1회 HUD 푸시 (초기값 표시).
  onHudChange(lastHud);

  const tick = (ts: number) => {
    if (lastTimestamp === null) {
      lastTimestamp = ts;
      rafId = requestAnimationFrame(tick);
      return;
    }
    const dt = ts - lastTimestamp;
    lastTimestamp = ts;

    // Paused면 update skip + accumulator 드레인 (resume 시 큰 dt step 방지).
    // render는 계속 — starfield 흐름은 tick 기반이라 시각 효과는 유지.
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
      // 누적된 dt가 너무 크면 (탭 백그라운드 등) 버림 — 스파이럴 방지.
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
