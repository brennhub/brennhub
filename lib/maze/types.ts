/** localStorage 스키마 버전. 의미 변경 시 +1 + storage.ts migrate() 갱신. */
export const SCHEMA_VERSION = 2;

/**
 * 타일 종류 — 정수로 저장한다.
 * 64×64 격자를 문자열 유니온("wall" 등)으로 직렬화하면 payload가 ~4배 커져
 * 숏링크 경량화 목표와 충돌 → 저장 포맷은 정수 고정 (README canonical).
 * 가독성은 아래 TILE 명명 상수로만 확보 — 매핑 레이어 없음, 저장값이 곧 정수.
 */
export type TileType = 0 | 1 | 2 | 3; // V2: | 4 | 5 | 6

/** 타일 정수 명명 상수 — 코드 가독성용. */
export const TILE = {
  EMPTY: 0, // 길
  WALL: 1, // 벽
  START: 2, // 시작점
  GOAL: 3, // 도착점
  // V2: TRAP: 4, KEY: 5, DOOR: 6
} as const;

/**
 * 그리드 차원 한계 (P3f 0.10.0 Phase A — 직사각 일반화).
 *
 * v1 = 정사각 고정 16|32|64. v2 = 임의 width × height (DIM_MIN..DIM_MAX).
 * Phase A는 내부 일반화만 — UI(settings-panel 프리셋)는 정사각 W=H 호출.
 * Phase B(0.11.0)에서 W·H NumberStepper UI 도입 + 비정사각 캔버스 처리.
 *
 * MIN_DIM 근거: 시작 1 + 통로 1 + 도착 1 = 3. 더 작으면 미로 의미 0.
 */
export const DIM_MIN = 3;
export const DIM_MAX = 128;

/** 기본 그리드 차원. */
export const DEFAULT_WIDTH = 32;
export const DEFAULT_HEIGHT = 32;

/** Phase A 호환용 정사각 프리셋 사이즈 — settings-panel 프리셋 버튼에서만 사용. */
export const SIZE_PRESETS: readonly number[] = [16, 32, 64];

/** Fog of War 가시 반경 — 정수·칸 단위. */
export const FOG_RADIUS = { MIN: 1, MAX: 6, DEFAULT: 3 } as const;

/** 타일 테마 — V1은 "default"만 사용. "sprite-dungeon"은 V2 테마 시스템. */
export type MazeTheme = "default" | "sprite-dungeon";

/**
 * 단일 미로 프로젝트 — README canonical 구조.
 *
 * v2(0.10.0): `size: number` → `width`/`height: number` 분리. 인덱싱은 grid[row][col]
 * 그대로 — `grid.length === height`, `grid[0].length === width`. v1 데이터는
 * storage.ts `migrate`가 width=height=size로 변환.
 */
export type MazeProject = {
  /** 숏링크 발급용 식별자 (P4 공유). */
  id: string;
  /** localStorage 마이그레이션용. */
  schemaVersion: number;
  /** 그리드 가로 칸 수 (= grid[r].length). DIM_MIN..DIM_MAX. */
  width: number;
  /** 그리드 세로 칸 수 (= grid.length). DIM_MIN..DIM_MAX. */
  height: number;
  /** 시야 제한 모드 (P3 fog 렌더). */
  fogOfWar: boolean;
  /** fogOfWar=true일 때 가시 반경 (칸, 1~6). */
  fogRadius: number;
  /** 타일 테마 — V1 "default" 고정. */
  theme: MazeTheme;
  /** grid[height][width] 정수 격자. 설정 단계에선 빈 배열 가능. */
  grid: TileType[][];
};
