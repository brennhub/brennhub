/**
 * 레시피 받아쓰기 — 데이터 모델.
 *
 * 정량(300g)과 감각량(한 움큼)은 동등한 1급 데이터다.
 * 감각량을 수치로 추정하지 않는다 — 확정 못 하는 값은 지어내지 않는다.
 */

export type Ingredient = {
  /** "돼지고기 목살" */
  name: string;
  /** 확정된 수량. 300 · 0.5 · null */
  qty: number | null;
  /** 범위 원문 "2~3". 범위일 때만 채워지고, 그때 qty는 null */
  qtyText: string | null;
  /** "g" · "줌" · null */
  unit: string | null;
  /** 감각량 원문 "약간". 수량으로 파싱 불가할 때만 */
  raw: string | null;
};

export type Step = {
  text: string;
  /** 저장 시점에 파싱 (열람 화면은 계산하지 않는다) */
  timerSec: number | null;
};

export type Recipe = {
  key: string;
  title: string;
  videoUrl: string | null;
  channel: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  createdAt: string;
  updatedAt: string;
};

/** 저장 요청 본문 (POST/PUT 공통) */
export type RecipeInput = {
  title: string;
  videoUrl?: string | null;
  channel?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
};

/** 입력 검증 한계 — API와 클라이언트가 같은 값을 쓴다 */
export const LIMITS = {
  titleMax: 100,
  channelMax: 100,
  videoUrlMax: 500,
  ingredientsMax: 60,
  stepsMax: 40,
  textMax: 500,
} as const;

/** 배율 세그먼트 — 열람 화면 */
export const SCALE_STEPS = [0.5, 1, 1.5, 2, 3] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];
