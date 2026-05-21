/**
 * 81수리 (姓名學 81數理) — 4격 길흉 계산.
 *
 * 격 정의 (3자 이름 기준):
 *   원격(元格)   = 성씨 획수
 *   형격(亨格)   = 성씨 + 이름 첫 글자 획수
 *   이격(利格)   = 이름 첫 글자 + 이름 둘째 글자 획수
 *   정격(貞格)   = 성씨 + 이름 전체 획수 (= 총격)
 *
 * 외자 이름(이름 한 글자): 이름 둘째 획수 = 0.
 *
 * 51 이상 수는 ((n-1) % 50) + 1 로 매핑 (51=1, 52=2, ..., 81=31).
 */

export type SurieGrade = "대길" | "길" | "반길" | "흉";

interface SurieEntry {
  grade: SurieGrade;
  desc: string;
}

// ───────────────────────── 81수 테이블 (1~50) ─────────────────────────

const SURIE_TABLE: Record<number, SurieEntry> = {
  1: { grade: "대길", desc: "만물의 근원, 강한 독립성" },
  2: { grade: "흉", desc: "분리, 이별, 불안정" },
  3: { grade: "길", desc: "지혜, 명예, 예술적 재능" },
  4: { grade: "흉", desc: "고독, 좌절, 불운" },
  5: { grade: "대길", desc: "오복, 안정, 포용력" },
  6: { grade: "길", desc: "책임감, 가정운, 안정" },
  7: { grade: "길", desc: "강인함, 독립, 의지" },
  8: { grade: "길", desc: "의지, 강한 발전운" },
  9: { grade: "흉", desc: "고난, 단절, 허무" },
  10: { grade: "흉", desc: "공허, 허무, 실패" },
  11: { grade: "길", desc: "발전, 번영, 상승운" },
  12: { grade: "흉", desc: "박약, 고독, 병약" },
  13: { grade: "길", desc: "지혜, 총명, 인기" },
  14: { grade: "흉", desc: "고독, 변동, 이산" },
  15: { grade: "대길", desc: "명예, 덕망, 리더십" },
  16: { grade: "길", desc: "덕망, 성공, 인복" },
  17: { grade: "길", desc: "강한 의지, 권위" },
  18: { grade: "길", desc: "발전, 성공, 재물운" },
  19: { grade: "흉", desc: "병약, 고독, 단명운" },
  20: { grade: "흉", desc: "허무, 실패, 공허" },
  21: { grade: "대길", desc: "두령운, 독립성, 강한 개성" },
  22: { grade: "흉", desc: "중도 좌절, 박약" },
  23: { grade: "길", desc: "명예, 성공, 발전" },
  24: { grade: "길", desc: "재물운, 성공, 안정" },
  25: { grade: "길", desc: "안정, 재능, 독창성" },
  26: { grade: "흉", desc: "파란, 영웅적 기질 (양날)" },
  27: { grade: "반길", desc: "독선, 고집, 일시적 성공" },
  28: { grade: "흉", desc: "파란, 고독, 불운" },
  29: { grade: "길", desc: "지혜, 성공, 명예" },
  30: { grade: "반길", desc: "부침, 성공과 실패 반복" },
  31: { grade: "대길", desc: "명예, 인복, 지도력" },
  32: { grade: "길", desc: "재물운, 인연운, 귀인" },
  33: { grade: "길", desc: "창의, 예술, 리더십 (의지 필요)" },
  34: { grade: "흉", desc: "파멸, 재난, 불운" },
  35: { grade: "길", desc: "안정, 평화, 학문운" },
  36: { grade: "반길", desc: "영웅적 기질, 파란" },
  37: { grade: "길", desc: "인덕, 명예, 성공" },
  38: { grade: "반길", desc: "학문운, 예술운 (큰 성공 어려움)" },
  39: { grade: "길", desc: "명예, 재물, 지혜" },
  40: { grade: "흉", desc: "변동, 불안, 허무" },
  41: { grade: "대길", desc: "번영, 명예, 최고 길수" },
  42: { grade: "흉", desc: "고독, 박약, 산만" },
  43: { grade: "흉", desc: "산만, 의지박약, 불운" },
  44: { grade: "흉", desc: "고난, 불운, 이산" },
  45: { grade: "길", desc: "지혜, 재능, 안정" },
  46: { grade: "흉", desc: "불안, 변동, 고독" },
  47: { grade: "길", desc: "성공, 명예, 귀인운" },
  48: { grade: "길", desc: "덕망, 지혜, 성공" },
  49: { grade: "반길", desc: "부침, 변동 (의지로 극복 가능)" },
  50: { grade: "반길", desc: "성패 반복, 부침" },
};

const GRADE_SCORE: Record<SurieGrade, number> = {
  대길: 25,
  길: 20,
  반길: 10,
  흉: 0,
};

// ───────────────────────── 매핑 (51+ → 1~50 순환) ─────────────────────────

/**
 * n이 51 이상이면 ((n-1) % 50) + 1 로 매핑.
 * 예: 51→1, 52→2, ..., 81→31. (50과 그 이하는 그대로.)
 */
export function getSurieInfo(n: number): SurieEntry {
  // 유효 격수는 1 이상 정수. 0/음수/NaN(획수 결측 등)은 흉 처리 — throw 대신 graceful degrade.
  // (recommend 풀은 null-stroke 한자를 SQL에서 제외하나, 이중 안전망.)
  if (!Number.isInteger(n) || n < 1) {
    return { grade: "흉", desc: "유효 격수 범위 밖 (획수 결측)" };
  }
  const key = n <= 50 ? n : ((n - 1) % 50) + 1;
  return SURIE_TABLE[key];
}

// ───────────────────────── 타입 ─────────────────────────

interface SurieScore {
  num: number;
  grade: SurieGrade;
  desc: string;
}

export interface SurieResult {
  wongyeok: number; // 원격
  hyeongyeok: number; // 형격
  igyeok: number; // 이격
  jeongyeok: number; // 정격
  scores: {
    wongyeok: SurieScore;
    hyeongyeok: SurieScore;
    igyeok: SurieScore;
    jeongyeok: SurieScore;
  };
  totalScore: number; // 0~100
}

// ───────────────────────── 메인 ─────────────────────────

function scoreOf(num: number): SurieScore {
  const info = getSurieInfo(num);
  return { num, grade: info.grade, desc: info.desc };
}

export function calculateSurie(
  sungStroke: number,
  name1Stroke: number,
  name2Stroke?: number,
): SurieResult {
  const n2 = name2Stroke ?? 0;
  const wongyeok = sungStroke;
  const hyeongyeok = sungStroke + name1Stroke;
  const igyeok = name1Stroke + n2;
  const jeongyeok = sungStroke + name1Stroke + n2;

  const scores = {
    wongyeok: scoreOf(wongyeok),
    hyeongyeok: scoreOf(hyeongyeok),
    igyeok: scoreOf(igyeok),
    jeongyeok: scoreOf(jeongyeok),
  };

  const totalScore =
    GRADE_SCORE[scores.wongyeok.grade] +
    GRADE_SCORE[scores.hyeongyeok.grade] +
    GRADE_SCORE[scores.igyeok.grade] +
    GRADE_SCORE[scores.jeongyeok.grade];

  return {
    wongyeok,
    hyeongyeok,
    igyeok,
    jeongyeok,
    scores,
    totalScore,
  };
}

// 검증은 `poc/surie-poc.test.ts`로 분리됨 (Edge runtime 호환).
