/**
 * 근거 대조(evidence gate) — 외부에서 뽑아 온 값(Cowork 추출 파일)은 원문 인용이 확인될 때만 받아들인다.
 *
 * 채택 조건 (필드마다):
 *  1. 인용이 있다                                  → 아니면 no_evidence
 *  2. 인용(15자 이상)이 우리가 저장한 원문(요약 + 약관)에 그대로 있다
 *     — 공백·따옴표·대시 차이만 무시                 → 아니면 quote_not_found
 *  3. 값이 그 인용 안에 실제로 있다 (금액·일수 숫자, 날짜 일치, 기간 단어)
 *                                                  → 아니면 value_not_in_quote
 */

import { parseDate } from "./detail";
import type { ApplyMethod } from "./types";

export const EXTRACT_FIELDS = [
  "expires_on",
  "churn_months",
  "dd_amount",
  "dd_days",
  "deposit_hold_amount",
  "deposit_hold_days",
  "apply_methods",
] as const;
export type ExtractField = (typeof EXTRACT_FIELDS)[number];

/** 추출 대상 판정 필드 — 이 중 하나라도 비면 export 대상. */
export const TARGET_FIELDS = ["expires_on", "churn_months", "dd_amount", "dd_days", "deposit_hold_amount"] as const;

export type ExtractValues = {
  expires_on?: string | null;
  churn_months?: number | null;
  churn_text?: string | null;
  dd_amount?: number | null;
  dd_days?: number | null;
  deposit_hold_amount?: number | null;
  deposit_hold_days?: number | null;
  apply_methods?: ApplyMethod[] | null;
};

export type GateReason = "no_evidence" | "quote_not_found" | "value_not_in_quote";

export const MIN_QUOTE = 15;

/** 공백·따옴표·대시 차이만 무시. */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/[“”″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsIn(quote: string, n: number): boolean {
  return new RegExp(`(?<![\\d])${n}(?![\\d])`).test(quote.replace(/,/g, ""));
}

const METHODS: ApplyMethod[] = ["online", "branch", "code", "invite"];

/** 값이 인용문 안에 실제로 들어 있는지 — 인용은 맞는데 엉뚱한 값을 붙인 경우를 거른다. */
export function valueInQuote(field: ExtractField, value: unknown, quote: string): boolean {
  switch (field) {
    case "dd_amount":
    case "deposit_hold_amount":
    case "dd_days":
    case "deposit_hold_days":
      return typeof value === "number" && Number.isInteger(value) && value > 0 && digitsIn(quote, value);
    case "churn_months":
      return typeof value === "number" && Number.isInteger(value) && value > 0 && /\b(?:month|year|day)s?\b/i.test(quote);
    case "expires_on": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const dates = quote.match(/(?:[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2}))/g) ?? [];
      return dates.some((d) => parseDate(d) === value);
    }
    case "apply_methods":
      return Array.isArray(value) && value.length > 0 && value.every((m) => METHODS.includes(m as ApplyMethod));
  }
}

/** 필드 1개 판정. haystack = 저장된 요약 + 약관 원문. */
export function checkEvidence(
  field: ExtractField,
  value: unknown,
  quote: string | null | undefined,
  haystack: string,
): { ok: true; quote: string } | { ok: false; reason: GateReason } {
  if (!quote || !quote.trim()) return { ok: false, reason: "no_evidence" };
  const q = normalizeForMatch(quote).replace(/[.;:,]+$/, "");
  if (q.length < MIN_QUOTE || !normalizeForMatch(haystack).includes(q)) return { ok: false, reason: "quote_not_found" };
  if (!valueInQuote(field, value, q)) return { ok: false, reason: "value_not_in_quote" };
  return { ok: true, quote: quote.trim().slice(0, 500) };
}

/** 요약 + 약관 — export가 내보낸 원문과 같은 묶음. */
export function sourceText(glance: string | null, finePrint: string | null): string {
  return [glance ? `Offer at a glance:\n${glance}` : "", finePrint ?? ""].join("\n\n");
}
