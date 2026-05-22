import { GRID_SIZE, type Glyph } from "./types";

/** 모든 픽셀이 비어 있는 16×16 비트맵 생성. */
export function emptyBitmap(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => false),
  );
}

/** 비트맵 깊은 복사 — React state 불변성 유지용. */
export function cloneBitmap(bitmap: boolean[][]): boolean[][] {
  return bitmap.map((row) => [...row]);
}

/** 16×16 boolean 격자인지 검증 (localStorage 손상 방어). */
export function isValidBitmap(value: unknown): value is boolean[][] {
  return (
    Array.isArray(value) &&
    value.length === GRID_SIZE &&
    value.every(
      (row) =>
        Array.isArray(row) &&
        row.length === GRID_SIZE &&
        row.every((cell) => typeof cell === "boolean"),
    )
  );
}

let glyphSeq = 0;

/** 충돌 없는 글리프 id 생성. */
export function newGlyphId(): string {
  glyphSeq += 1;
  return `g-${Date.now().toString(36)}-${glyphSeq.toString(36)}`;
}

/** 빈 글리프(트리거 없음 + 빈 비트맵) 생성. */
export function newGlyph(): Glyph {
  return { id: newGlyphId(), trigger: "", bitmap: emptyBitmap() };
}

/**
 * 비트맵을 canvas 컨텍스트에 그린다.
 * (originX, originY)에서 시작, 픽셀 한 칸 = cell px, 채워진 픽셀은 ink 색.
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  bitmap: boolean[][],
  originX: number,
  originY: number,
  cell: number,
  ink: string,
): void {
  ctx.fillStyle = ink;
  for (let r = 0; r < bitmap.length; r += 1) {
    const row = bitmap[r];
    for (let c = 0; c < row.length; c += 1) {
      if (row[c]) {
        ctx.fillRect(originX + c * cell, originY + r * cell, cell, cell);
      }
    }
  }
}

/** 타자기 토큰 — 매핑된 글리프 또는 미매핑 원문 글자. */
export type Token =
  | { kind: "glyph"; glyph: Glyph }
  | { kind: "literal"; char: string };

/**
 * 입력 텍스트를 토큰 배열로 변환한다.
 * 트리거가 단어일 수 있으므로 각 위치에서 가장 긴 트리거 매칭을 우선한다
 * (longest-match). 매칭이 없으면 한 글자를 literal 토큰으로 흘려보낸다.
 */
export function tokenize(text: string, glyphs: Glyph[]): Token[] {
  // 트리거가 있는 글리프만, 긴 트리거 우선으로 정렬.
  const mapped = glyphs
    .filter((g) => g.trigger.length > 0)
    .sort((a, b) => b.trigger.length - a.trigger.length);

  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    let matched: Glyph | null = null;
    for (const g of mapped) {
      if (text.startsWith(g.trigger, i)) {
        matched = g;
        break;
      }
    }
    if (matched) {
      tokens.push({ kind: "glyph", glyph: matched });
      i += matched.trigger.length;
    } else {
      tokens.push({ kind: "literal", char: text[i] });
      i += 1;
    }
  }
  return tokens;
}
