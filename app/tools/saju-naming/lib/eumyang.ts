/**
 * 작명 음양 배열 (영역 C-1) — 원획(won_stroke) 홀짝 + 배열 길흉 판정.
 *
 * 한국 통용 작명 성명학 표준: 한자 획수 홀수=양(陽) / 짝수=음(陰).
 * 본 도구는 81수리와 일관되게 **원획(won_stroke, C-4-B 환원법)** 사용.
 *
 * 배열 길흉 (학파 일치 강한 부분만 채택):
 *   전부 양(양양양 / 양양) = 凶
 *   전부 음(음음음 / 음음) = 凶
 *   그 외 (섞임)            = 吉
 *
 * ⚠️ 세부 길흉 패턴화(양양음 > 양음양 등)는 학파 차이가 커 비채택.
 *    사주 음양 가중("사주 全양이면 이름 全음 OK") 별개 축, 본 모듈 미반영.
 *    발음 음양(모음 양성/음성)은 별도 축(`sound-ohaeng.ts`와 분리), backlog.
 *
 * 적용 (recommend 후처리, Plan #3 옵션 A):
 *   점수 정렬 후 topN 직전 — 길 후보 우선 채움.
 *   길 후보 부족 시 흉 후보로 보충 (NameCandidate.eumyang.result="흉" 표시).
 *   → 추천 0개/부족 방지 + 사용자에 부조화 가시화 (Brenn fallback 안전장치).
 *
 * 출처 (학파 일치 표준, cross-ref):
 *   - namesoft.co.kr "음양조화 분석"
 *   - icomerapps.com "수리음양"
 *   - tarot cafe 다음 카페 "획수음양"
 *   - agiirum 발음음양 (cross-ref)
 *   - 나무위키(CC BY-NC-SA) 미사용
 */

// ───────────────── 타입 ─────────────────

export type Eumyang = "양" | "음";
export type EumyangArrangement = "길" | "흉";

export interface EumyangMeta {
  /** 성씨 + 이름 각 글자의 음양 배열 (예: ["양","음","양"]). */
  readonly arrangement: ReadonlyArray<Eumyang>;
  /** 표시용 패턴 문자열 (예: "양음양"). */
  readonly pattern: string;
  /** 길흉 판정 — 전부 같으면 "흉", 섞이면 "길". */
  readonly result: EumyangArrangement;
}

// ───────────────── 판단 ─────────────────

/** 원획 홀짝 → 음양 (학파 일치 표준). */
export function getEumyang(wonStroke: number): Eumyang {
  return wonStroke % 2 === 1 ? "양" : "음";
}

/**
 * 배열 길흉 판정 — 전부 양 또는 전부 음이면 흉, 그 외 길.
 *
 * @param arrangement 성씨 + 이름 한자 음양 배열 (최소 2자).
 */
export function evaluateEumyangArrangement(
  arrangement: ReadonlyArray<Eumyang>,
): { result: EumyangArrangement; pattern: string } {
  const pattern = arrangement.join("");
  if (arrangement.length < 2) {
    return { result: "길", pattern };
  }
  const first = arrangement[0];
  const allSame = arrangement.every((e) => e === first);
  return { result: allSame ? "흉" : "길", pattern };
}

/**
 * 성씨 원획 + 이름 한자 원획 배열 → EumyangMeta.
 *
 * @param sungWonStroke 성씨 원획.
 * @param charWonStrokes 이름 한자 원획 배열 (nameLength=1 → 1개, =2 → 2개).
 */
export function buildEumyangMeta(
  sungWonStroke: number,
  charWonStrokes: ReadonlyArray<number>,
): EumyangMeta {
  const arrangement: Eumyang[] = [
    getEumyang(sungWonStroke),
    ...charWonStrokes.map(getEumyang),
  ];
  const { result, pattern } = evaluateEumyangArrangement(arrangement);
  return { arrangement, pattern, result };
}
