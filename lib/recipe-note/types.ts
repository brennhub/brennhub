/**
 * 레시피 받아쓰기 — 데이터 모델.
 *
 * **원문 보존 원칙**: 입력 줄은 손대지 않고 통째로 저장한다. 파서는 그 안의
 * 수량 토큰을 *제안*만 하고, 어디까지가 양인지 확정하는 것은 사용자다.
 *
 * 구 모델은 파서가 `{name, qty, unit, raw}`로 쪼개 저장했고 원문이 남지 않았다.
 * "뜨거운 물"이 이름 "뜨거운" + 양 "물"로 갈라져도 복구할 방법이 없었다.
 * 지금은 파서가 틀려도 최악이 "배율이 안 먹는다"(복구 가능)이지
 * "글자가 바뀐다"(복구 불가)가 아니다.
 */

/** 사용자가 확정한 수량 토큰 — `Ingredient.text` 안의 한 구간. */
export type QtySelection = {
  /** text 내 문자 오프셋 [start, end) */
  start: number;
  end: number;
  /** 단일 수치. 300 · 0.5 · 범위면 null */
  qty: number | null;
  /** 범위 원문 "2~3". 범위일 때만 채워지고, 그때 qty는 null */
  qtyText: string | null;
  /**
   * 단위 — **원문 그대로**다 ("kg" · "ML" · "그램").
   * 사전은 자동 검출에만 쓰고 저장값은 정규화하지 않는다. 덕분에
   * `200ML` ×2가 `400ML`로 표기까지 보존되고, scale.ts의 구분자 복원이
   * 기대는 "unit 길이 == 원문 길이"가 가정이 아니라 정의가 된다.
   * 수동 지정으로 단위 없는 수량을 고르면 빈 문자열.
   */
  unit: string;
};

export type Ingredient = {
  /** 입력 줄 원문. 공백 정규화는 오프셋 계산 전 클라이언트에서 1회만. */
  text: string;
  /** 사용자가 확정한 수량 토큰. 없으면 null — 배율과 무관하게 원문 유지. */
  sel: QtySelection | null;
  /**
   * 아래 셋은 전부 optional — 이 필드들이 생기기 전에 저장된 레코드가 그대로
   * 로드돼야 한다. `undefined`는 각각 false·빈 문자열로 취급한다.
   * 값이 비면 키를 아예 넣지 않아 JSON이 불필요하게 커지지 않게 한다.
   */
  /** 선택 재료 — 없어도 되는 것. */
  optional?: boolean;
  /** 브랜드·제품명. */
  brand?: string;
  /** 구입처. */
  store?: string;
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
  /** 브랜드·구입처 각각의 상한. */
  metaMax: 100,
} as const;

/** 배율 세그먼트 — 열람 화면 */
export const SCALE_STEPS = [0.5, 1, 1.5, 2, 3] as const;
export type ScaleStep = (typeof SCALE_STEPS)[number];
