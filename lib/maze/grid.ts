import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  FOG_RADIUS,
  SCHEMA_VERSION,
  TILE,
  type MazeProject,
  type TileType,
} from "./types";
import { ZOOM_REFERENCE_SIZE } from "./viewport";

/**
 * 단일 통과성 술어 — BFS(검증)와 플레이어 이동이 반드시 같은 정의를 쓰도록 강제.
 *
 * EMPTY / START / GOAL = 통과 가능. WALL = 차단.
 * V2 신규 타일(TRAP / KEY / DOOR) 추가 시 여기 한 곳만 갱신하면 검증·이동이
 * 동시에 따라온다.
 */
export function isPassable(tile: TileType | undefined): boolean {
  return tile === TILE.EMPTY || tile === TILE.START || tile === TILE.GOAL;
}

/** 모든 칸이 길(EMPTY)인 width×height 격자 생성. grid[r].length === width. */
export function emptyGrid(width: number, height: number): TileType[][] {
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE.EMPTY as TileType),
  );
}

/** 격자 깊은 복사 — React state 불변성 유지용. */
export function cloneGrid(grid: TileType[][]): TileType[][] {
  return grid.map((row) => [...row]);
}

/** width×height 정수 격자인지 검증 (localStorage 손상 방어). */
export function isValidGrid(
  value: unknown,
  width: number,
  height: number,
): value is TileType[][] {
  return (
    Array.isArray(value) &&
    value.length === height &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === width &&
        row.every(
          (cell) => cell === 0 || cell === 1 || cell === 2 || cell === 3,
        ),
    )
  );
}

/** 시작점(START) 칸 좌표를 찾는다. 없으면 null. */
export function findStart(
  grid: TileType[][],
): { r: number; c: number } | null {
  for (let r = 0; r < grid.length; r += 1) {
    const row = grid[r];
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === TILE.START) return { r, c };
    }
  }
  return null;
}

let mazeSeq = 0;

/** 충돌 없는 미로 id 생성 (glyph.ts newGlyphId 패턴). */
export function newMazeId(): string {
  mazeSeq += 1;
  return `m-${Date.now().toString(36)}-${mazeSeq.toString(36)}`;
}

/** 기본값으로 새 미로 프로젝트 생성. grid는 만들기 단계에서 빌드. */
export function newProject(): MazeProject {
  return {
    id: newMazeId(),
    schemaVersion: SCHEMA_VERSION,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    fogOfWar: false,
    fogRadius: FOG_RADIUS.DEFAULT,
    theme: "default",
    // 플레이 시야 거리 기본 = 16 (가장 가까이). 32/64 그리드는 카메라 추적, 16은 자동 fit.
    playViewSpan: ZOOM_REFERENCE_SIZE,
    grid: [],
  };
}
