import { isPassable } from "./grid";
import { TILE, type TileType } from "./types";

/**
 * 완결성 검증 — 순수 결정론 함수.
 *
 * 기획서 3규칙 중:
 *   - 규칙1(엔드포인트): 시작점 정확히 1개 + 도착점 1개 이상 → `endpoints`.
 *   - 규칙2(외곽 폐쇄): boundary clamp으로 자동 충족 — BFS·플레이어 이동 모두
 *     `0 ≤ r,c < size` 안에서만 동작하므로 grid 밖 탈출이 물리적으로 불가능.
 *     명시 체크 없음. 단 P3b 이동 구현이 동일 clamp 규약을 반드시 따라야
 *     검증의 통과성과 플레이의 통과성이 일치한다.
 *   - 규칙3(도달성): 시작점에서 4방향 BFS로 도착점 최소 1개에 도달 가능 → `reachability`.
 *
 * 통과성은 `grid.ts`의 `isPassable` 단일 헬퍼를 사용 — 플레이어 이동(play.ts)과
 * 정의를 공유한다. BFS 통과성 == 이동 통과성을 구조적으로 보장 (드리프트 차단).
 */

/** 검증 실패 사유 식별자 — UI에서 i18n으로 메시지 합성. */
export type ValidationFailureCode =
  | "no-start"
  | "multiple-starts"
  | "no-goal"
  | "unreachable-goals"
  // endpoints 미통과로 도달성 검사가 의미를 갖지 못해 보류한 상태.
  // UI는 endpoints 실패 사유를 우선 표시하므로 사용자에게 직접 노출되지 않지만,
  // 펼침 뷰에서 도달성 row를 별도 라벨로 표시할 때 식별자로 사용.
  | "skipped";

export type RuleResult = { ok: true } | { ok: false; code: ValidationFailureCode };

export type ValidationResult = {
  ok: boolean;
  endpoints: RuleResult;
  reachability: RuleResult;
};

/** 시작점/도착점 좌표 수집. */
function collectEndpoints(grid: TileType[][]): {
  starts: { r: number; c: number }[];
  goals: { r: number; c: number }[];
} {
  const starts: { r: number; c: number }[] = [];
  const goals: { r: number; c: number }[] = [];
  for (let r = 0; r < grid.length; r += 1) {
    const row = grid[r];
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === TILE.START) starts.push({ r, c });
      else if (row[c] === TILE.GOAL) goals.push({ r, c });
    }
  }
  return { starts, goals };
}

/**
 * 단일 source에서 도달 가능한 goal이 하나라도 있는지 4방향 BFS.
 * grid가 비어 있으면 false (호출자에서 별도로 가드 — 빈 grid는 endpoints 단계에서 이미 실패).
 */
function anyGoalReachable(
  grid: TileType[][],
  start: { r: number; c: number },
  goalSet: Set<string>,
): boolean {
  if (goalSet.size === 0) return false;
  const size = grid.length;
  const visited: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false),
  );
  const queue: { r: number; c: number }[] = [start];
  visited[start.r][start.c] = true;
  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    if (goalSet.has(`${r},${c}`)) return true;
    // 4방향 — boundary clamp으로 grid 밖은 자연스럽게 차단.
    const neighbors = [
      { r: r - 1, c },
      { r: r + 1, c },
      { r, c: c - 1 },
      { r, c: c + 1 },
    ];
    for (const n of neighbors) {
      if (n.r < 0 || n.r >= size || n.c < 0 || n.c >= size) continue;
      if (visited[n.r][n.c]) continue;
      if (!isPassable(grid[n.r]?.[n.c])) continue;
      visited[n.r][n.c] = true;
      queue.push(n);
    }
  }
  return false;
}

/**
 * 미로 격자 완결성 검증.
 *
 * 빈 grid(`[]`)·정사각이 아닌 grid도 안전하게 처리 — Step2 진입 직후 빈 격자에서
 * 호출돼도 크래시 없이 endpoints 실패로 반환. 도달성 단계는 source 없으면 skip.
 */
export function validateMaze(grid: TileType[][]): ValidationResult {
  // 빈 / 비정상 grid 가드 — endpoints 0개로 처리.
  if (!Array.isArray(grid) || grid.length === 0) {
    return {
      ok: false,
      endpoints: { ok: false, code: "no-start" },
      reachability: { ok: false, code: "no-start" },
    };
  }

  const { starts, goals } = collectEndpoints(grid);

  // 규칙1: 엔드포인트.
  let endpoints: RuleResult;
  if (starts.length === 0) endpoints = { ok: false, code: "no-start" };
  else if (starts.length > 1) endpoints = { ok: false, code: "multiple-starts" };
  else if (goals.length === 0) endpoints = { ok: false, code: "no-goal" };
  else endpoints = { ok: true };

  // 규칙3: 도달성. source(시작점 1개)가 확정되어야 의미 있음 —
  // 그 외 케이스는 "skipped"로 표시. UI는 endpoints 실패 사유를 우선 노출하므로
  // 사용자가 사유 두 개를 동시에 보지 않게 분리.
  let reachability: RuleResult;
  if (!endpoints.ok) {
    reachability = { ok: false, code: "skipped" };
  } else {
    const goalSet = new Set(goals.map((g) => `${g.r},${g.c}`));
    const reachable = anyGoalReachable(grid, starts[0], goalSet);
    reachability = reachable ? { ok: true } : { ok: false, code: "unreachable-goals" };
  }

  return {
    ok: endpoints.ok && reachability.ok,
    endpoints,
    reachability,
  };
}
