/**
 * 추천 부적합 한자 필터 — Task 39-C 추천 품질 가드.
 *
 * recommend 풀(inname_ok=1)은 법적 사용 가능 인명용 한자지만 의미 불량(卵 알·危 위태)
 * ·희귀 벽자(㔕)가 섞여 의미-blind 점수만으로 상위 등극(dev 검증 2회: 金犴危/金卵㔕).
 * frequency 실데이터 미가용(39-C 정찰) → 경량 가드:
 *   1. 희귀 블록 — CJK URO 밖(확장 A/B) 제외.
 *   2. 부정 의미 키워드 — 훈에 죽을·위태·무너질 등 → 제외.
 *   3. 명시 블랙리스트 — 키워드 충돌 회피로 못 잡는 명백 부정·부적합 한자.
 *
 * 키워드/블랙리스트는 **풀 9,055 의미(훈) 데이터 스캔으로 도출**(추측 X) 후 도메인
 * 선별. 충돌 회피 원칙:
 *   - 다음절·저모호 부정 훈만 키워드 (예 "위태"·"무너질").
 *   - 음·타훈 충돌 어휘는 키워드 배제하고 특정 한자만 블랙리스트:
 *       "병"→炳秉柄兵 충돌 → 病疾疫 등 char / "거짓"→誕(낳을)·眠(잘) 충돌 → 僞 char /
 *       "귀신"→神 충돌 → 鬼 char / "똥"→便 충돌 → 屎糞 char / "낮을"→低 충돌 → 卑庳 char /
 *       "험할"→試(시험할) 충돌 → 險嶮 char / "독할"→督 충돌 → 酷 char /
 *       "사나울"→猛 충돌 → 暴 char / "다칠"→創(비롯할) 충돌 → 傷 char /
 *       "벌레"→昆(맏) 충돌 → 蟲虫 char / "마귀"→까마귀·사마귀 충돌 → 鬼 char.
 *
 * best-effort 휴리스틱 — 완전 의미/어감 평가는 Task 45 AI 어감(Premium).
 */

export interface ExcludeEntry {
  character: string;
  meaning: string | null;
}

/**
 * CJK URO(U+4E00~U+9FFF) 밖 = 희귀 블록.
 * 확장 A(U+3400~)·확장 B 이상(U+20000~)·비표준(plane 10/15) 모두 포함.
 */
export function isRareBlock(character: string): boolean {
  const cp = character.codePointAt(0);
  if (cp === undefined) return false;
  return cp < 0x4e00 || cp >= 0x20000;
}

/**
 * 부정 의미 훈 키워드 — 풀 의미 스캔 도출(다음절·저모호만, 음·타훈 충돌 어휘 배제).
 * 사망·질병/장애·재앙·악/추함·범죄·슬픔·요괴·부패·어리석음·궁핍·음란·태만·부정 동물 등.
 */
export const NEGATIVE_MEANING_KEYWORDS: readonly string[] = [
  // 사망
  "죽을", "죽일", "주검", "시체", "송장", "무덤",
  // 질병·장애
  "학질", "부스럼", "종기", "벙어리", "귀머거리", "곱사", "절뚝", "절름",
  // 재앙·위험
  "위태", "재앙", "재난",
  // 악·흉·추함
  "흉할", "흉악", "사악", "악할", "추할", "천할", "더러울", "모질",
  // 범죄·원한
  "도둑", "도적", "훔칠", "속일", "헐뜯", "원망", "원수",
  // 슬픔·탄식
  "슬플", "한탄",
  // 요괴
  "요괴", "도깨비",
  // 부패·소멸
  "썩을", "곰팡이", "구더기", "시들", "무너질", "망할",
  // 어리석음·어두움
  "어리석을", "어두울",
  // 궁핍
  "가난", "주릴",
  // 음란·태만
  "음란", "음탕", "게으를",
  // 부적합 동물(지지·해충 포함)
  "돼지", "뱀",
];

/**
 * 명시 제외 — 키워드 충돌 회피로 못 잡는 명백 부정·부적합 한자 (풀 스캔 확인).
 * 각 한자 verbatim 의미는 docs/CHANGELOG·보고 참조.
 */
export const EXPLICIT_EXCLUDE: ReadonlySet<string> = new Set([
  // 비부정-부적합 동물·사물 (키워드 회피군)
  "卵", // 알
  "蛇", // 뱀
  "鼠", // 쥐
  "蟲", // 벌레
  "虫", // 벌레
  "豚", // 돼지
  // 질병 ("병" 음 충돌 → char)
  "病", // 병 병
  "疾", // 병 질
  "疫", // 전염병 역
  "瘟", // 돌림병 온
  "癘", // 나병 려
  "癩", // 나병 라
  // 배설 ("똥/오줌" 便 충돌 → char)
  "屎", // 똥 시
  "糞", // 똥 분
  "尿", // 오줌 뇨
  // 낮음·험준 ("낮을" 低 / "험할" 試 충돌 → char)
  "卑", // 낮을 비
  "庳", // 낮을 비
  "險", // 험할 험
  "嶮", // 험할 험
  // 귀신·거짓 ("귀신" 神 / "거짓" 誕·眠 충돌 → char)
  "鬼", // 귀신 귀
  "僞", // 거짓 위
  // 가혹·포악·상해 ("독할" 督 / "사나울" 猛 / "다칠" 創 충돌 → char)
  "酷", // 독할 혹
  "暴", // 사나울 포
  "傷", // 다칠 상
]);

/**
 * 화이트리스트 — 키워드 오탐이나 작명상 양호해 통과시키는 예외 한자.
 * 다의어가 부정 훈을 함께 가져 키워드에 걸리지만 긍정 의미가 주된 경우.
 */
export const WHITELIST: ReadonlySet<string> = new Set([
  "憧", // 동경할/어리석을 동 — "어리석을" 오탐 보호 (憧憬=동경, 긍정)
]);

/** 의미(훈)에 부정 키워드 포함 여부. */
export function hasNegativeMeaning(meaning: string | null): boolean {
  if (!meaning) return false;
  return NEGATIVE_MEANING_KEYWORDS.some((k) => meaning.includes(k));
}

/** 추천에서 제외할 한자인지 (희귀 블록 ∪ 명시 블랙리스트 ∪ 부정 의미). 화이트리스트 우선. */
export function isExcludedFromRecommend(entry: ExcludeEntry): boolean {
  if (WHITELIST.has(entry.character)) return false;
  return (
    isRareBlock(entry.character) ||
    EXPLICIT_EXCLUDE.has(entry.character) ||
    hasNegativeMeaning(entry.meaning)
  );
}
