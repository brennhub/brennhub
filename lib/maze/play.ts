import { findStart, isPassable } from "./grid";
import { TILE, type TileType } from "./types";

/**
 * 플레이 모드 — 순수 결정론 게임 상태.
 *
 * 통과성은 `grid.ts`의 `isPassable` 단일 헬퍼 사용 — `validate.ts` BFS와
 * 정의 공유. 좌표는 `[0, size-1]` clamp — grid 밖 탈출이 물리적으로 불가능
 * (규칙2 = boundary clamp 자동 충족, README/validate 헤더 참조).
 *
 * P4 공유 진입에서도 이 모듈을 그대로 재사용 — 진입점은 PlayMode 컴포넌트,
 * 상태 변환은 본 모듈의 순수 함수.
 */

export type Dir = "up" | "down" | "left" | "right";

export type Pos = { r: number; c: number };

export type PlayState = {
  player: Pos;
  won: boolean;
};

const DELTA: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

/**
 * 시작점에서 출발하는 초기 PlayState.
 *
 * 시작점이 없거나 grid가 비어 있으면 null — 호출자는 검증 통과(`validateMaze`)
 * 후에만 호출하는 것이 정상이지만, 방어적으로 null 반환을 처리해야 한다
 * (PlayMode가 fallback UI 또는 진입 차단).
 */
export function initialPlayState(grid: TileType[][]): PlayState | null {
  const start = findStart(grid);
  if (!start) return null;
  return { player: { r: start.r, c: start.c }, won: false };
}

/**
 * 한 칸 이동 시도.
 *
 * - 새 좌표 = 현재 + delta. `[0, size-1]` clamp 검사로 경계 차단.
 * - 새 좌표의 타일이 `isPassable` 아니면 진입 차단 — 상태 변동 없음(같은 객체 반환).
 * - 새 좌표가 GOAL이면 won = true. 이미 won 상태에서도 이동은 허용
 *   (UI는 모달로 묶지만 모듈 차원에선 idempotent).
 */
export function applyMove(
  state: PlayState,
  dir: Dir,
  grid: TileType[][],
): PlayState {
  const size = grid.length;
  if (size === 0) return state;
  const { dr, dc } = DELTA[dir];
  const nr = state.player.r + dr;
  const nc = state.player.c + dc;
  // 경계 clamp — grid 밖은 차단.
  if (nr < 0 || nr >= size || nc < 0 || nc >= size) return state;
  const next = grid[nr]?.[nc];
  if (!isPassable(next)) return state;
  const won = next === TILE.GOAL;
  return { player: { r: nr, c: nc }, won: state.won || won };
}

/** 현재 위치가 도착점인가. applyMove가 이미 won을 set하지만 외부 동기화·복원용. */
export function isWin(state: PlayState, grid: TileType[][]): boolean {
  return grid[state.player.r]?.[state.player.c] === TILE.GOAL;
}
