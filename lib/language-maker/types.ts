/** 픽셀 글리프 격자 한 변 — 16×16 고정 (V1 자문 확정). */
export const GRID_SIZE = 16;

/** localStorage 스키마 버전. 의미 변경 시 +1 + storage.ts migrate() 갱신. */
export const SCHEMA_VERSION = 1;

/** 단일 글리프 — 16×16 비트맵 + 1:1 매핑 트리거 문자열. */
export type Glyph = {
  id: string;
  /** 1:1 치환 트리거 (글자 또는 단어). 빈 문자열이면 미매핑 상태. */
  trigger: string;
  /** 16×16 픽셀 비트맵. bitmap[row][col], true = 채워진 픽셀. */
  bitmap: boolean[][];
};

/** V1 = 단일 언어 = 글리프 컬렉션 1개. 멀티 언어 프로젝트는 V2. */
export type LanguageProject = {
  schemaVersion: number;
  glyphs: Glyph[];
};
