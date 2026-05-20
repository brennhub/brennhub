/**
 * 원획법(原劃法) 계산 — 변형 부수를 원형으로 환원한 획수.
 *
 * C-4-B 확정 룰 (BACKLOG §C-4-B, commit 2c3eb17 / yesname.co.kr 명리학 통용 표준):
 *   - 변형 부수 14개 → 원형 부수 획수로 환원.
 *   - 숫자 한자 13개 → 의미값 (표면 획수 무시).
 *
 * 공식: won_stroke = additional_strokes(kRSUnicode 잔여획) + 원획[radical_number]
 *   - additional_strokes = 부수 제외 나머지 획수 → Unihan의 부수 획수 계산 방식과 무관.
 *   - 원획 = C-4-B 환원표의 원형 부수 획수. (필획 불사용 — variant detection 불필요.)
 *   - 14부수 외: won_stroke = total_strokes (환원 없음).
 *   - 비표준 한자 (radical_number null): won_stroke = null.
 *
 * 순수 함수 — I/O · process.exit 없음 (Edge runtime 안전).
 */

/** 숫자 한자 의미값 환원 — 표면 획수 무시 (C-4-B 확정, 13자). */
export const NUMERIC_HANJA: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  百: 6,
  千: 3,
  萬: 15,
};

/**
 * 14 변형 부수 → 원형 부수 획수(원획). C-4-B 환원표 verbatim.
 * key = 강희 부수번호, value = 원획.
 *   忄→心(61) 氵→水(85) 扌→手(64) 犭→犬(94) 王→玉(96) 礻→示(113) 月→肉(130)
 *   耂→老(125) 衤→衣(145) 艹→艸(140) 罒→网(122) 辶→辵(162) 阝좌→阜(170) 阝우→邑(163)
 */
export const RADICAL_WON_STROKE: Record<number, number> = {
  61: 4, // 忄 → 心
  85: 4, // 氵 → 水
  64: 4, // 扌 → 手
  94: 4, // 犭 → 犬
  96: 5, // 王 → 玉
  113: 5, // 礻 → 示
  130: 6, // 月(육달월) → 肉
  125: 6, // 耂 → 老
  145: 6, // 衤 → 衣
  140: 6, // 艹 → 艸
  122: 6, // 罒 → 网
  162: 7, // 辶 → 辵
  170: 7, // 阝(좌부방) → 阜
  163: 8, // 阝(우부방) → 邑
};

/**
 * 원획법 획수 계산.
 *
 * @param character        한자 글자 (숫자 한자 판정용)
 * @param totalStrokes     Unihan kTotalStrokes (필획 총수)
 * @param additionalStrokes Unihan kRSUnicode 잔여획 (부수 제외 나머지)
 * @param radicalNumber    강희 부수번호 1~214
 * @returns 원획 수 / 비표준(부수 정보 없음) 시 null
 */
export function calculateWonStroke(
  character: string,
  totalStrokes: number | null,
  additionalStrokes: number | null,
  radicalNumber: number | null,
): number | null {
  // 비표준 한자 (Unihan 미수록) — 정직하게 null
  if (radicalNumber === null || totalStrokes === null) return null;

  // 숫자 한자 — 의미값 환원 우선 (표면 획수 무시; 萬은 radical 140이나 override 우선)
  const numeric = NUMERIC_HANJA[character];
  if (numeric !== undefined) return numeric;

  // 14 변형 부수 — 잔여획 + 원획 (원획법 환원)
  const wonRadical = RADICAL_WON_STROKE[radicalNumber];
  if (wonRadical !== undefined && additionalStrokes !== null) {
    return additionalStrokes + wonRadical;
  }

  // 그 외 — 환원 없음
  return totalStrokes;
}
