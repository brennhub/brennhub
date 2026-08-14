import type { Ingredient } from "./types";
import { formatNumber, splitRange } from "./parse";

/**
 * 배율 환산 + 표기 (기획서 §4-2, §2-2).
 *
 * 환산 대상은 **확정된 수량뿐**이다. 감각량("약간")과 이름만 있는 항목은
 * 배율이 몇이든 원문 그대로 나간다 — 0.5배를 곱해 "약간의 절반"을 만들어내는
 * 순간 시스템이 모르는 것을 아는 척하게 된다.
 */

/** 근사 분수 후보 (기획서 §4-2). `0.375포기` 대신 `1/3 포기`를 만든다. */
const NICE_FRACTIONS: { value: number; label: string }[] = [
  { value: 1 / 4, label: "1/4" },
  { value: 1 / 3, label: "1/3" },
  { value: 1 / 2, label: "1/2" },
  { value: 2 / 3, label: "2/3" },
  { value: 3 / 4, label: "3/4" },
];

/**
 * 기획서가 정한 허용 오차. 이 밖은 소수 2자리 반올림.
 * EPSILON은 부동소수 오차 흡수용 — `1 - 0.98`이 0.020000000000000018이라
 * 경계값이 문서와 다르게 떨어지는 것을 막는다.
 */
const FRACTION_TOLERANCE = 0.02;
const EPSILON = 1e-9;

function within(diff: number): boolean {
  return diff <= FRACTION_TOLERANCE + EPSILON;
}

/**
 * 아주 작은 양을 "0"으로 적지 않는다. 0은 "없다"는 뜻이고,
 * 있는 것을 없다고 쓰는 순간 이 도구는 거짓말을 한다.
 */
function formatPositiveSmall(n: number): string {
  if (Number(n.toFixed(2)) === 0) return String(Number(n.toPrecision(1)));
  return formatNumber(n);
}

/**
 * 수량 표기 — 근사 분수 우선, 그 외 소수 최대 2자리 (기획서 §4-2).
 *   0.5 → "1/2" · 2.5 → "2 1/2" · 300 → "300" · 0.375 → "0.38" · 0.001 → "0.001"
 *
 * 정수로 당겨 붙이는 별도 밴드는 두지 않는다 — 기획서에 없고, 0.98을 "1"로
 * 적으면 없는 반올림을 하는 셈이다. 부동소수 찌꺼기(2.9999…)는 소수 2자리
 * 반올림이 이미 흡수한다.
 */
export function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n <= 0) return formatNumber(n);

  const whole = Math.floor(n);
  const frac = n - whole;

  for (const f of NICE_FRACTIONS) {
    if (within(Math.abs(frac - f.value))) {
      return whole === 0 ? f.label : `${whole} ${f.label}`;
    }
  }

  return formatPositiveSmall(n);
}

/** "2~3" × 2 → "4~6". 양 끝을 각각 곱한다 (기획서 §3 범위 규칙). */
export function scaleRangeText(qtyText: string, multiplier: number): string {
  const range = splitRange(qtyText);
  if (!range) return qtyText;
  return `${formatQty(range.from * multiplier)}${range.sep}${formatQty(
    range.to * multiplier,
  )}`;
}

export type ScaledAmount = {
  /** 화면에 찍을 문자열. 빈 문자열이면 양 표기 없음. */
  text: string;
  /** 배율이 실제로 적용됐는지 — accent 색 판단용. */
  scaled: boolean;
};

/**
 * 재료 1건의 표시용 수량. 배율 ≠ 1이고 확정 수량이 있을 때만 `scaled: true`.
 * 감각량·이름만 항목은 배율과 무관하게 원문을 그대로 돌려준다.
 */
export function scaledAmount(
  ing: Ingredient,
  multiplier: number,
): ScaledAmount {
  const withUnit = (amount: string) =>
    amount && ing.unit ? `${amount} ${ing.unit}` : amount;

  if (ing.qtyText !== null) {
    return {
      text: withUnit(scaleRangeText(ing.qtyText, multiplier)),
      scaled: multiplier !== 1,
    };
  }

  if (ing.qty !== null) {
    return {
      text: withUnit(formatQty(ing.qty * multiplier)),
      scaled: multiplier !== 1,
    };
  }

  // 감각량 원문 — 배율 무시 (기획서 §2-2, §3).
  if (ing.raw !== null) return { text: withUnit(ing.raw), scaled: false };

  return { text: "", scaled: false };
}

/** 배율이 실제로 무언가를 바꾸는 항목이 하나라도 있는지 — 안내 문구 노출 판단. */
export function hasScalableIngredient(ingredients: Ingredient[]): boolean {
  return ingredients.some((i) => i.qty !== null || i.qtyText !== null);
}

/** 배율 세그먼트 라벨 — "×0.5" · "×1" · "×1.5". */
export function formatMultiplier(multiplier: number): string {
  return `×${formatNumber(multiplier)}`;
}
