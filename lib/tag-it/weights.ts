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
  // ── 충돌 0 추가분 (0.8.1) — 진단으로 드러난 누락 ──
  // ① 관형형 "는"(겪는/가는/먹는/오는) — 0.8.0 작성 누락. 충돌 0(~는 명사 없음) → 안전.
  { pattern: "는", weight: 45, collision: 0 },
  // ① 인용 "다고"(했다고/물었다고). 단독 "다고"는 stopword라 영향 X, "X다고" 토큰용.
  { pattern: "다고", weight: 45, collision: 0 },
  // ④ 축약 과거형(밝혔다/봤다/왔다 류) — 았/었/였 어미가 어간 모음과 융합. 전부 충돌 0 실측.
  { pattern: "왔다", weight: 45, collision: 0 },
  { pattern: "갔다", weight: 45, collision: 0 },
  { pattern: "났다", weight: 45, collision: 0 },
  { pattern: "봤다", weight: 45, collision: 0 },
  { pattern: "줬다", weight: 45, collision: 0 },
  { pattern: "췄다", weight: 45, collision: 0 },
  { pattern: "꿨다", weight: 45, collision: 0 },
  { pattern: "됐다", weight: 45, collision: 0 },
  { pattern: "혔다", weight: 45, collision: 0 },
  { pattern: "겼다", weight: 45, collision: 0 },
  { pattern: "녔다", weight: 45, collision: 0 },
  { pattern: "쳤다", weight: 45, collision: 0 },
  { pattern: "렸다", weight: 45, collision: 0 },
  { pattern: "꼈다", weight: 45, collision: 0 },
  { pattern: "켰다", weight: 45, collision: 0 },
  { pattern: "셨다", weight: 45, collision: 0 },
  { pattern: "떴다", weight: 45, collision: 0 },
  { pattern: "섰다", weight: 45, collision: 0 },
  { pattern: "컸다", weight: 45, collision: 0 },
  { pattern: "팠다", weight: 45, collision: 0 },
  { pattern: "랬다", weight: 45, collision: 0 },
  { pattern: "쨌다", weight: 45, collision: 0 },
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
  // "히"(부사 어미, 0.8.10): 충돌 38 — 표본이 하인리히/페니히/케르니히(외래 인명·단위)·
  //   올히/다히(고어) 위주라 생산적 현대 명사 말음은 사실상 없음. 비-INFL이라 신호1 합산도
  //   없음(완전히/단순히/꼼꼼히 등 부사 50→46, 후순위로만 — 학살 아님). RULES.md §A-3.
  { pattern: "히", weight: 4, collision: 38 },
  { pattern: "을", weight: 4, collision: 61 },
  { pattern: "여", weight: 4, collision: 135 },
  { pattern: "은", weight: 4, collision: 203 },
  { pattern: "다", weight: 4, collision: 234 },
  { pattern: "요", weight: 4, collision: 270 },
  { pattern: "임", weight: 4, collision: 275 },
  { pattern: "게", weight: 4, collision: 292 },
  // ── 충돌 300+ : 명사 말음 → 0 (차감 금지. 가게/창고/가면/녹음/가다랑어/가경지 보호) ──
  // ⚠️ 면/고/아/어/음/지는 INFL 어미(신호1 발동) — 작은 차감 주면 신호1(30)과 합산돼 비사전
  //    명사가 임계 밑으로 갈 위험 → 0 유지(§A-1). 아래 A-1 작은 차감은 비-INFL 패턴만.
  { pattern: "면", weight: 0, collision: 524 },
  { pattern: "고", weight: 0, collision: 684 },
  { pattern: "아", weight: 0, collision: 744 },
  { pattern: "어", weight: 0, collision: 1082 },
  { pattern: "음", weight: 0, collision: 1103 },
  { pattern: "지", weight: 0, collision: 3365 },
  // ── A-1 (0.8.5) 위험 어미·1글자 조사 작은 차감 (충돌 역수 차등, 비-INFL만) ──
  // "0이 아니라 작은 차감"으로 불확실성을 % 로 표현. 큰 차감은 명사 학살이라 금지.
  // 사전 O는 floor 85라 안전(원의 97·회의 97·차이 99 — 의심 표현, 명사 지위 보호).
  // 비사전 명사는 최악 50−3=47 ≥ 임계 40이라 생존(endingDecrement longest-match 1개 +
  // 비-INFL이라 신호1 미발동 → 누적 차감 구조적 불가). 충돌<2000→w3·2000~5000→w2·5000+→w1.
  { pattern: "의", weight: 3, collision: 1430 },
  { pattern: "가", weight: 3, collision: 1367 },
  { pattern: "도", weight: 3, collision: 1487 },
  { pattern: "과", weight: 3, collision: 1238 },
  { pattern: "로", weight: 3, collision: 681 },
  { pattern: "를", weight: 3, collision: 4 },
  { pattern: "인", weight: 3, collision: 1483 },
  { pattern: "한", weight: 3, collision: 327 },
  { pattern: "화", weight: 3, collision: 1455 },
  // "적"(한자 접미사 -的, 0.8.10): 충돌 506 — 목적/견적/공적 등 사전O 명사 다수 포함이나
  //   전부 floor 85 보호. 비-INFL(신호1 미발동)·충돌<2000 → w3(화/성 패밀리). longest-match가
  //   "적인"(35)을 먼저 잡아 객관적인은 중복 차감 없음. 객관적/구조적/수학적 등 비사전 형용사
  //   어근(50→47) 후순위화. RULES.md §A-3.
  { pattern: "적", weight: 3, collision: 506 },
  { pattern: "성", weight: 2, collision: 2124 },
  { pattern: "이", weight: 1, collision: 6403 },
  { pattern: "기", weight: 1, collision: 6587 },
];
