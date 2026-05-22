import {
  DEFAULT_SIZE,
  FOG_RADIUS,
  SCHEMA_VERSION,
  TILE,
  type MazeProject,
  type MazeSize,
  type TileType,
} from "./types";

/** 모든 칸이 길(EMPTY)인 size×size 격자 생성. */
export function emptyGrid(size: MazeSize): TileType[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => TILE.EMPTY as TileType),
  );
}

/** 격자 깊은 복사 — React state 불변성 유지용. */
export function cloneGrid(grid: TileType[][]): TileType[][] {
  return grid.map((row) => [...row]);
}

/** size×size 정수 격자인지 검증 (localStorage 손상 방어). */
export function isValidGrid(
  value: unknown,
  size: number,
): value is TileType[][] {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === size &&
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

/** 기본값으로 새 미로 프로젝트 생성. grid는 Step2 진입 시 빌드. */
export function newProject(): MazeProject {
  return {
    id: newMazeId(),
    schemaVersion: SCHEMA_VERSION,
    size: DEFAULT_SIZE,
    fogOfWar: false,
    fogRadius: FOG_RADIUS.DEFAULT,
    theme: "default",
    grid: [],
  };
}
