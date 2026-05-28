/**
 * 추천 부적합 한자 필터 — Task 39-C 경량 품질 가드.
 *
 * recommend 풀(inname_ok=1)은 법적 사용 가능 인명용 한자지만 의미 불량(卵 알·危 위태)
 * ·희귀 벽자(㔕 등)가 섞여, 의미-blind 점수(음령+수리)만으로 상위 등극하는 문제
 * (dev 검증 2회: 金犴危 / 金卵㔕). frequency 실데이터(작명·일반)는 무료·기계가독
 * 으로 미가용(39-C 정찰: 대법원=한글 이름순위 per-name / Unihan kFrequency=17.0
 * 제거) → 경량 가드:
 *   1. 희귀 블록 — CJK URO 밖(확장 A/B) 제외 (벽자 차단, 풀 269자/3% tradeoff).
 *   2. 부정 의미 키워드 — 훈에 죽을·위태·흉할 등 → 제외.
 *   3. 명시 블랙리스트 — 키워드로 안 잡히는 비부정-부적합(卵 알·蛇 뱀 등).
 *
 * best-effort 휴리스틱 — 완전 의미/어감 평가는 Task 45 AI 어감(Premium). 키워드는
 * 오탐 회피 위해 보수적(다음절·저모호 훈만 — "병"/"미칠" 등 음·타훈 충돌 어휘 배제).
 */

export interface ExcludeEntry {
  character: string;
  meaning: string | null;
}

/**
 * CJK URO(U+4E00~U+9FFF) 밖 = 희귀 블록.
 * 확장 A(U+3400~)·확장 B 이상(U+20000~)·비표준(plane 10/15)을 모두 포함.
 */
export function isRareBlock(character: string): boolean {
  const cp = character.codePointAt(0);
  if (cp === undefined) return false;
  return cp < 0x4e00 || cp >= 0x20000;
}

/**
 * 부정 의미 훈 키워드 — 작명 부적합(죽음·질병·재앙·악·천함 등).
 * 다음절·저모호 훈만 (음/타훈 오탐 회피: "병"·"미칠"·"독" 등 단음절·동음 배제).
 */
export const NEGATIVE_MEANING_KEYWORDS: readonly string[] = [
  "죽을",
  "죽일",
  "주검",
  "시체",
  "송장",
  "위태",
  "흉할",
  "흉악",
  "재앙",
  "재난",
  "사악",
  "악할",
  "도둑",
  "도적",
  "훔칠",
  "천할",
  "더러울",
  "거짓",
  "귀신",
  "요괴",
  "무덤",
  "부스럼",
  "종기",
  "구더기",
  "곰팡이",
];

/**
 * 명시 제외 — 의미가 부정은 아니나 작명 부적합 (키워드 회피군: 동물·신체·사물).
 * 卵(알)이 dev 검증서 상위 등극 → 동류 보수적 등록. 도메인 검증 대상.
 */
export const EXPLICIT_EXCLUDE: ReadonlySet<string> = new Set([
  "卵", // 알 (egg)
  "蛇", // 뱀
  "鼠", // 쥐
  "蟲", // 벌레
  "虫", // 벌레
  "豚", // 돼지
]);

/** 의미(훈)에 부정 키워드 포함 여부. */
export function hasNegativeMeaning(meaning: string | null): boolean {
  if (!meaning) return false;
  return NEGATIVE_MEANING_KEYWORDS.some((k) => meaning.includes(k));
}

/** 추천에서 제외할 한자인지 (희귀 블록 ∪ 명시 블랙리스트 ∪ 부정 의미). */
export function isExcludedFromRecommend(entry: ExcludeEntry): boolean {
  return (
    isRareBlock(entry.character) ||
    EXPLICIT_EXCLUDE.has(entry.character) ||
    hasNegativeMeaning(entry.meaning)
  );
}
