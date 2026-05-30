/**
 * 명사 확률 모델 가중치 부록 (Phase 3). "코드 수정 없이 가중치만 조정" — extract.ts는
 * 이 표를 읽어 차감만 한다. 오탐/누락이 보이면 **여기 숫자만** 고친다.
 *
 * ── 모델 (extract.ts §명사확률) ──
 *   사전 O(NNG): p = 100 − min(decr, DICT_MAX_DECR)   → 하한 DICT_FLOOR(85). 추락 봉쇄.
 *   사전 X      : p = NONDICT_START(50) − min(decr, NONDICT_MAX_DECR)  → 하한 0.
 *   decr = (어미 longest-match 가중치) + (신호1 용언 패러다임? SIGNAL1) + (기능어간? FUNCTIONAL)
 *   채택 조건: p >= THRESHOLD[강도].  (강도 = 임계 — 엄격할수록 높음)
 *
 * ── 가중치 = "명사 충돌 역수" (BRENNHUB 정신: 사전으로 규칙을 검증) ──
 *   충돌 = mecab NNG 사전(216,932개)에서 그 어미로 끝나는 명사 수(`len>어미 && endsWith`).
 *   충돌이 적을수록 "명사가 아니라 용언 활용"이라는 신호가 확실 → 큰 가중치(강한 차감).
 *   충돌이 크면 그 글자는 명사 말음 → 가중치 0 (명사 보존 우선, 절대 큰 차감 금지).
 *   실측 밴드:  0→45 · 1~3→35 · 4~6→25 · 7~15→12 · 16~300→4 · 300+→0
 *
 *   ⚠️ 가중치는 "우리 사전 안의 잠정 추정"이지 언어의 진실이 아니다. 보수적으로.
 */

import type { FilterStrength } from "./types";

/** 사전 O 시작 확률 */
export const DICT_START = 100;
/** 사전 O 하한 (추락 봉쇄 floor) */
export const DICT_FLOOR = 85;
/** 사전 O 최대 차감 = DICT_START − DICT_FLOOR */
export const DICT_MAX_DECR = DICT_START - DICT_FLOOR; // 15
/** 사전 X 시작 확률 */
export const NONDICT_START = 50;
/** 사전 X 최대 차감 (하한 0) */
export const NONDICT_MAX_DECR = NONDICT_START; // 50

/**
 * 신호1 — 용언 활용 패러다임 가중치. 토큰의 어간이 문서 안에서 용언 활용(하다/되다/었다…)과
 * 함께 나타나면(= 그 어간은 용언) 차감. 강한 신호지만 절대값 아님(동음이의 여지).
 */
export const SIGNAL1_WEIGHT = 30;

/**
 * 기능 용언/형용사 어간(있/없/같/아니…) 가중치 — 명사일 가능성 0.
 * 사전 X에서 확실히 제거(50 − 60 < 0)되도록 NONDICT_MAX_DECR 이상.
 * (사전 O면 floor 85로 보호되지만 이 어간들은 애초에 NNG 사전에 거의 없음.)
 */
export const FUNCTIONAL_STEM_WEIGHT = 60;

/**
 * 강도 → 채택 임계. 강도 1~2는 0(확률 제거 없음 = 관대, 기존 동작 유지).
 * 강도 3~5에서만 용언 차감이 발동.
 *
 * ⚠️ 50점 경계 설계 (사용자 지적): 사전 X 명사는 차감 0이면 50점에 모인다.
 *    임계를 50에 두면 그 무리가 통째로 생사 갈림 → 임계 최대 40으로 둬 **사전 X 명사(50)는
 *    전 강도 보존**, 사전 X 용언(어미 차감 후 ≤15)은 강도 3+에서 제거되도록 분리.
 *    (Phase 4에서 시나리오 데이터로 최종 확정.)
 */
export const THRESHOLD: Record<FilterStrength, number> = {
  1: 0,
  2: 0,
  3: 20,
  4: 30,
  5: 40,
};

/** 어미 가중치 항목 — pattern(어미) / weight(차감) / collision(사전 명사 충돌 수). */
export type EndingWeight = {
  pattern: string;
  weight: number;
  collision: number;
};

/**
 * 어미별 가중치 (충돌 실측 2026-05). extract.ts에서 longest-match 1개만 적용(합산 아님).
 * 충돌 0~6 종결/연결 어미는 강한 차감, 1글자 명사 말음(지/음/어/고/면…)은 0.
 */
export const ENDING_WEIGHTS: EndingWeight[] = [
  // ── 충돌 0 : 확정적 종결·연결·인용 어미 (명사 말음과 안 겹침) → 45 ──
  { pattern: "습니다", weight: 45, collision: 0 },
  { pattern: "입니다", weight: 45, collision: 0 },
  { pattern: "합니다", weight: 45, collision: 0 },
  { pattern: "됩니다", weight: 45, collision: 0 },
  { pattern: "았다고", weight: 45, collision: 0 },
  { pattern: "었다고", weight: 45, collision: 0 },
  { pattern: "였다고", weight: 45, collision: 0 },
  { pattern: "이라고", weight: 45, collision: 0 },
  { pattern: "스러운", weight: 45, collision: 0 },
  { pattern: "였다", weight: 45, collision: 0 },
  { pattern: "했다", weight: 45, collision: 0 },
  { pattern: "한다", weight: 45, collision: 0 },
  { pattern: "된다", weight: 45, collision: 0 },
  { pattern: "는다", weight: 45, collision: 0 },
  { pattern: "겠다", weight: 45, collision: 0 },
  { pattern: "았다", weight: 45, collision: 0 },
  { pattern: "었다", weight: 45, collision: 0 },
  { pattern: "하며", weight: 45, collision: 0 },
  { pattern: "면서", weight: 45, collision: 0 },
  { pattern: "거나", weight: 45, collision: 0 },
  { pattern: "든지", weight: 45, collision: 0 },
  { pattern: "군요", weight: 45, collision: 0 },
  { pattern: "네요", weight: 45, collision: 0 },
  { pattern: "구나", weight: 45, collision: 0 },
  { pattern: "으면", weight: 45, collision: 0 },
  { pattern: "되면", weight: 45, collision: 0 },
  { pattern: "이면", weight: 45, collision: 0 },
  { pattern: "보면", weight: 45, collision: 0 },
  { pattern: "하고", weight: 45, collision: 0 },
  { pattern: "했고", weight: 45, collision: 0 },
  { pattern: "했던", weight: 45, collision: 0 },
  { pattern: "하던", weight: 45, collision: 0 },
  { pattern: "었던", weight: 45, collision: 0 },
  { pattern: "았던", weight: 45, collision: 0 },
  { pattern: "였던", weight: 45, collision: 0 },
  { pattern: "이던", weight: 45, collision: 0 },
  { pattern: "라는", weight: 45, collision: 0 },
  { pattern: "다는", weight: 45, collision: 0 },
  { pattern: "으니", weight: 45, collision: 0 },
  { pattern: "으며", weight: 45, collision: 0 },
  { pattern: "되는", weight: 45, collision: 0 },
  { pattern: "하는", weight: 45, collision: 0 },
  { pattern: "지는", weight: 45, collision: 0 },
  { pattern: "되며", weight: 45, collision: 0 },
  { pattern: "되고", weight: 45, collision: 0 },
  { pattern: "되어", weight: 45, collision: 0 },
  { pattern: "하여", weight: 45, collision: 0 },
  { pattern: "하게", weight: 45, collision: 0 },
  { pattern: "로운", weight: 45, collision: 0 },
  { pattern: "다며", weight: 45, collision: 0 },
  { pattern: "라며", weight: 45, collision: 0 },
  { pattern: "냐고", weight: 45, collision: 0 },
  { pattern: "여서", weight: 45, collision: 0 },
  { pattern: "된", weight: 45, collision: 0 },
  { pattern: "죠", weight: 45, collision: 0 },
  { pattern: "며", weight: 45, collision: 0 },
  // ── 충돌 1~3 : 거의 안전한 어미 → 35 (목적인/부지하지 등 소수 명사 충돌) ──
  { pattern: "되다", weight: 35, collision: 1 },
  { pattern: "해서", weight: 35, collision: 1 },
  { pattern: "는데", weight: 35, collision: 1 },
  { pattern: "하면", weight: 35, collision: 1 },
  { pattern: "해야", weight: 35, collision: 1 },
  { pattern: "인데", weight: 35, collision: 1 },
  { pattern: "어서", weight: 35, collision: 1 },
  { pattern: "하다", weight: 35, collision: 2 },
  { pattern: "라고", weight: 35, collision: 2 },
  { pattern: "지만", weight: 35, collision: 3 },
  { pattern: "하지", weight: 35, collision: 3 },
  { pattern: "적인", weight: 35, collision: 3 },
  { pattern: "아서", weight: 35, collision: 3 },
  // ── 충돌 4~6 : 주의 어미 → 25 (미이라/사이다/구기자고 류) ──
  { pattern: "이라", weight: 25, collision: 4 },
  { pattern: "자고", weight: 25, collision: 5 },
  { pattern: "이다", weight: 25, collision: 6 },
  // ── 충돌 7~15 : 약한 신호 → 12 (노던/모던 류 외래어 명사 충돌) ──
  { pattern: "던", weight: 12, collision: 8 },
  // ── 충돌 16~300 : 명사 말음 다수 → 4 (가벼운 신호만) ──
  { pattern: "을", weight: 4, collision: 61 },
  { pattern: "여", weight: 4, collision: 135 },
  { pattern: "은", weight: 4, collision: 203 },
  { pattern: "다", weight: 4, collision: 234 },
  { pattern: "요", weight: 4, collision: 270 },
  { pattern: "임", weight: 4, collision: 275 },
  { pattern: "게", weight: 4, collision: 292 },
  // ── 충돌 300+ : 명사 말음 → 0 (차감 금지. 가게/창고/가면/녹음/가다랑어/가경지 보호) ──
  { pattern: "면", weight: 0, collision: 524 },
  { pattern: "고", weight: 0, collision: 684 },
  { pattern: "아", weight: 0, collision: 744 },
  { pattern: "어", weight: 0, collision: 1082 },
  { pattern: "음", weight: 0, collision: 1103 },
  { pattern: "지", weight: 0, collision: 3365 },
];
