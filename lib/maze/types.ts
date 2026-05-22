/** localStorage 스키마 버전. 의미 변경 시 +1 + storage.ts migrate() 갱신. */
export const SCHEMA_VERSION = 1;

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

/** 정사각 격자 한 변 칸 수 — 3종 고정 (기획서 사양). */
export type MazeSize = 16 | 32 | 64;

/** 선택 가능한 사이즈 목록 (Step1 설정 UI 순회용). */
export const SIZES: readonly MazeSize[] = [16, 32, 64];

/** 기본 격자 사이즈. */
export const DEFAULT_SIZE: MazeSize = 32;

/** Fog of War 가시 반경 — 세 사이즈 공통, 정수·칸 단위. */
export const FOG_RADIUS = { MIN: 1, MAX: 6, DEFAULT: 3 } as const;

/** 타일 테마 — V1은 "default"만 사용. "sprite-dungeon"은 V2 테마 시스템. */
export type MazeTheme = "default" | "sprite-dungeon";

/** 단일 미로 프로젝트 — README canonical 구조. */
export type MazeProject = {
  /** 숏링크 발급용 식별자 (P4 공유). */
  id: string;
  /** localStorage 마이그레이션용. */
  schemaVersion: number;
  /** 정사각 한 변 칸 수. */
  size: MazeSize;
  /** 시야 제한 모드 (P3 fog 렌더). */
  fogOfWar: boolean;
  /** fogOfWar=true일 때 가시 반경 (칸, 1~6). */
  fogRadius: number;
  /** 타일 테마 — V1 "default" 고정. */
  theme: MazeTheme;
  /** [size][size] 타일 정수 격자. Step1(설정) 단계에서는 빈 배열. */
  grid: TileType[][];
};
