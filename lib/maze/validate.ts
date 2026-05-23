import { isPassable } from "./grid";
import { TILE, type TileType } from "./types";

/**
 * === 점수 튜닝 상수 ===
 *
 * 본 블록만 수정하면 점수 분포가 바뀐다 — 로직 변경 없이 재튜닝 가능.
 *
 * **fragile 1차안**: 외길 0.707 · 미로 0.734 추정치 사이 폭이 0.027 — STAR_THRESHOLDS[2]=0.72는
 * 그 좁은 폭에 끼워넣은 값. dev archetype 4개(빈 들판/벽 허술/외길/제대로 된 미로)를
 * 실제로 만들어 total 실측 후 보정 필수 (BACKLOG 항목). 좋은 미로가 0.72 밑으로 떨어지면
 * 외길과 ★3 뭉쳐 사용자 원불만(허접/좋은 미로 구분 X) 재발.
 */
const SCORE_TUNING = {
  // A: 경로 우회도
  DETOUR_BASELINE: 1,
  DETOUR_SATURATION: 4,
  // B: 복도성 base × 텍스처 보너스 (P3a-2 revised — degree≥3 직접 count 폐기)
  CORRIDOR_BASE_WEIGHT: 0.5,
  TEXTURE_SATURATION: 0.15,
  // 합성 = sqrt(A * B). "둘 다 있어야 점수" — 가산식 역전 차단.
  // 가중치 상수(WEIGHT_DETOUR / WEIGHT_TOPOLOGY)는 가중 기하평균이 역전 부활시키므로 미사용.
  STAR_THRESHOLDS: [0.2, 0.4, 0.72, 0.85] as const,
  WEAKNESS_THRESHOLD: 0.3,
  // 트리비얼 가드 — manhattan ≤ 이 값이면 미로라 부르기 어려움. 강제 ★1.
  TRIVIAL_MANHATTAN: 1,
} as const;

export type Stars = 1 | 2 | 3 | 4 | 5;

export type WeaknessCode = "low-detour" | "no-corridors" | "no-texture";

export type Dimension = {
  /** 정규화 0..1 점수 — UI 차원 바와 weakness 판정에 사용. */
  norm: number;
  /** 원시값 — dev 임계값 보정용 디버깅 신호 (raw 비율). */
  raw: number;
};

export type MazeScore = {
  stars: Stars;
  /** 합성 점수 0..1 (= sqrt(A * B)). */
  total: number;
  /** A. 경로 우회도 — BFS 최단 / 맨해튼. */
  detour: Dimension;
  /** B-base. 복도성 — 통과 셀 중 degree ≤ 2 비율. 빈 들판이 자동 0이 되는 구조적 보호. */
  corridor: Dimension;
  /** B-texture. 갈림+막다른 길(시작/도착 제외) 밀도. */
  texture: Dimension;
  /** 약점 코드 — null이면 가장 약한 차원도 임계값 이상. */
  weakness: WeaknessCode | null;
};

/**
 * 완결성 검증 — 순수 결정론 함수.
 *
 * 기획서 3규칙 중:
 *   - 규칙1(엔드포인트): 시작점 정확히 1개 + 도착점 1개 이상 → `endpoints`.
 *   - 규칙2(외곽 폐쇄): boundary clamp으로 자동 충족 — BFS·플레이어 이동 모두
 *     `0 ≤ r < height, 0 ≤ c < width` 안에서만 동작하므로 grid 밖 탈출이 물리적으로 불가능.
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
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
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
      if (n.r < 0 || n.r >= height || n.c < 0 || n.c >= width) continue;
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

// ─────────────────────────────────────────────────────────────
// 미로 품질 점수 (P3a-2)
// ─────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function thresholdToStars(total: number): Stars {
  const [t1, t2, t3, t4] = SCORE_TUNING.STAR_THRESHOLDS;
  if (total < t1) return 1;
  if (total < t2) return 2;
  if (total < t3) return 3;
  if (total < t4) return 4;
  return 5;
}

/** 단일 source BFS — 모든 통과 셀까지의 최단거리 맵. 도달 불가는 Infinity. */
function bfsDistanceMap(
  grid: TileType[][],
  start: { r: number; c: number },
): number[][] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const dist: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Infinity),
  );
  dist[start.r][start.c] = 0;
  const queue: { r: number; c: number }[] = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const d = dist[cur.r][cur.c];
    const neighbors = [
      { r: cur.r - 1, c: cur.c },
      { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 },
      { r: cur.r, c: cur.c + 1 },
    ];
    for (const n of neighbors) {
      if (n.r < 0 || n.r >= height || n.c < 0 || n.c >= width) continue;
      if (!isPassable(grid[n.r]?.[n.c])) continue;
      if (dist[n.r][n.c] !== Infinity) continue;
      dist[n.r][n.c] = d + 1;
      queue.push(n);
    }
  }
  return dist;
}

/**
 * 미로 품질 점수 산출 — 완결성 통과(`validateMaze` ok) 미로에만 호출 전제.
 *
 * - A(detour): BFS 최단 / 맨해튼. 직선이면 0, saturation에서 1.
 * - B(corridor·texture): 복도성 base × (BASE_WEIGHT + (1-BASE_WEIGHT) × 텍스처).
 *   빈 들판이 corridor_score≈0이 되어 B=0이 구조적으로 보장됨.
 * - total = sqrt(A × B). 가산식 역전(외길 > 미로) 차단.
 *
 * 빈 grid·시작점 부재 등 예외 케이스는 null 반환 — 호출자는 validation.ok일 때만
 * 부르는 것이 정상이지만 방어용 fallback.
 */
export function scoreMaze(grid: TileType[][]): MazeScore | null {
  const height = grid.length;
  if (height === 0) return null;

  const { starts, goals } = collectEndpoints(grid);
  if (starts.length !== 1 || goals.length === 0) return null;
  const start = starts[0];

  // BFS distMap — 64×64 = 4096 cells, µs 수준.
  const distMap = bfsDistanceMap(grid, start);

  // 가장 가까운 (도달 가능한) 도착점.
  let nearestDist = Infinity;
  let nearestGoal: { r: number; c: number } | null = null;
  for (const g of goals) {
    const d = distMap[g.r]?.[g.c] ?? Infinity;
    if (d < nearestDist) {
      nearestDist = d;
      nearestGoal = g;
    }
  }
  if (!nearestGoal || nearestDist === Infinity) return null;

  const manhattan =
    Math.abs(nearestGoal.r - start.r) + Math.abs(nearestGoal.c - start.c);

  // 트리비얼 가드 — 시작·도착 인접: 미로라 부르기 어려움. 강제 ★1.
  if (manhattan <= SCORE_TUNING.TRIVIAL_MANHATTAN) {
    return {
      stars: 1,
      total: 0,
      detour: { norm: 0, raw: manhattan === 0 ? 0 : 1 },
      corridor: { norm: 0, raw: 0 },
      texture: { norm: 0, raw: 0 },
      weakness: "low-detour",
    };
  }

  // === A: 경로 우회도 ===
  const detourRatio = nearestDist / manhattan;
  const detourNorm = clamp01(
    (detourRatio - SCORE_TUNING.DETOUR_BASELINE) /
      (SCORE_TUNING.DETOUR_SATURATION - SCORE_TUNING.DETOUR_BASELINE),
  );

  // === degree 집계 (단일 패스) ===
  let passableN = 0;
  let corridorN = 0;
  let junctionN = 0;
  let deadEndRealN = 0; // 시작·도착 제외한 "진짜" 막다른 길
  for (let r = 0; r < height; r += 1) {
    const row = grid[r];
    for (let c = 0; c < row.length; c += 1) {
      const tile = row[c];
      if (!isPassable(tile)) continue;
      passableN += 1;
      let deg = 0;
      if (isPassable(grid[r - 1]?.[c])) deg += 1;
      if (isPassable(grid[r + 1]?.[c])) deg += 1;
      if (isPassable(grid[r]?.[c - 1])) deg += 1;
      if (isPassable(grid[r]?.[c + 1])) deg += 1;
      if (deg <= 2) corridorN += 1;
      if (deg >= 3) junctionN += 1;
      if (deg === 1 && tile !== TILE.START && tile !== TILE.GOAL) {
        deadEndRealN += 1;
      }
    }
  }

  // === B: corridor base × texture 보너스 ===
  // passableN === 0은 완결성 통과 전제로 발생 X — 방어용 0나눗셈 가드.
  const corridorRatio = passableN > 0 ? corridorN / passableN : 0;
  const textureRatio =
    passableN > 0 ? (junctionN + deadEndRealN) / passableN : 0;
  const textureNorm = clamp01(textureRatio / SCORE_TUNING.TEXTURE_SATURATION);
  const corridorNorm = corridorRatio; // 0..1 자연 정규화
  const b =
    corridorNorm *
    (SCORE_TUNING.CORRIDOR_BASE_WEIGHT +
      (1 - SCORE_TUNING.CORRIDOR_BASE_WEIGHT) * textureNorm);

  // === 합성: 기하평균 ===
  const total = Math.sqrt(detourNorm * b);

  // === 약점 (가장 약한 차원 1개) ===
  let weakness: WeaknessCode | null = null;
  if (detourNorm < SCORE_TUNING.WEAKNESS_THRESHOLD) {
    weakness = "low-detour";
  } else if (corridorNorm < SCORE_TUNING.WEAKNESS_THRESHOLD) {
    weakness = "no-corridors";
  } else if (textureNorm < SCORE_TUNING.WEAKNESS_THRESHOLD) {
    weakness = "no-texture";
  }

  return {
    stars: thresholdToStars(total),
    total,
    detour: { norm: detourNorm, raw: detourRatio },
    corridor: { norm: corridorNorm, raw: corridorRatio },
    texture: { norm: textureNorm, raw: textureRatio },
    weakness,
  };
}
