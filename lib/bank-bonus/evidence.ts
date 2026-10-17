/**
 * 근거 대조(evidence gate) — 외부에서 뽑아 온 값(Cowork 추출 파일)은 원문 인용이 확인될 때만 받아들인다.
 *
 * 원문은 두 묶음: 은행 공식 페이지 본문(official) → DoC 글 요약 + 약관(doc_post). 공식을 먼저 찾고, 어느 쪽에서
 * 찾았는지를 같이 돌려준다 (표시 우선순위 manual > official > doc_post > doc_churn).
 *
 * 채택 조건 (필드마다):
 *  1. 인용이 있다                                  → 아니면 no_evidence
 *  2. 인용(15자 이상)이 원문에 그대로 있다
 *     — 공백·따옴표·대시 차이만 무시                 → 아니면 quote_not_found
 *  3. 값이 그 인용 안에 있다 (금액·일수 숫자, 날짜 일치, 기간 단어; 글 필드는 값이 인용의 일부)
 *                                                  → 아니면 value_not_in_quote
 * 조건 단계(requirements)는 단계마다 인용 1개, 한 단계라도 실패하면 체크리스트 전체를 버린다 (부분 체크리스트 금지).
 */

import { parseDate } from "./detail";
import type { AchPush, ApplyMethod, RequirementKind, RequirementStep } from "./types";

export const EXTRACT_FIELDS = [
  "expires_on",
  "churn_months",
  "reapply_once_only",
  "dd_amount",
  "dd_days",
  "deposit_hold_amount",
  "deposit_hold_days",
  "apply_methods",
  "ach_push",
  "eligibility_text",
  "fee_waiver_text",
  "early_termination_text",
  "requirements",
] as const;
export type ExtractField = (typeof EXTRACT_FIELDS)[number];
export type ScalarField = Exclude<ExtractField, "requirements">;

/** DB 칸 이름 (requirements → requirements_json). */
export const FIELD_COLUMN: Record<ExtractField, string> = {
  expires_on: "expires_on",
  churn_months: "churn_months",
  reapply_once_only: "reapply_once_only",
  dd_amount: "dd_amount",
  dd_days: "dd_days",
  deposit_hold_amount: "deposit_hold_amount",
  deposit_hold_days: "deposit_hold_days",
  apply_methods: "apply_methods",
  ach_push: "ach_push",
  eligibility_text: "eligibility_text",
  fee_waiver_text: "fee_waiver_text",
  early_termination_text: "early_termination_text",
  requirements: "requirements_json",
};

/** export 대상 판정 필드 — 이 중 하나라도 비면 Cowork가 볼 오퍼. */
export const TARGET_FIELDS = ["expires_on", "churn_months", "dd_amount", "dd_days", "deposit_hold_amount", "requirements", "ach_push"] as const;

const TEXT_FIELDS = new Set<ExtractField>(["eligibility_text", "fee_waiver_text", "early_termination_text"]);

export type ExtractValues = {
  expires_on?: string | null;
  churn_months?: number | null;
  churn_text?: string | null;
  reapply_once_only?: 0 | 1 | null;
  dd_amount?: number | null;
  dd_days?: number | null;
  deposit_hold_amount?: number | null;
  deposit_hold_days?: number | null;
  apply_methods?: ApplyMethod[] | null;
  ach_push?: AchPush | null;
  ach_push_text?: string | null;
  eligibility_text?: string | null;
  fee_waiver_text?: string | null;
  early_termination_text?: string | null;
  requirements?: RequirementStep[] | null;
};

export type GateReason = "no_evidence" | "quote_not_found" | "value_not_in_quote";
export type MatchSource = "official" | "doc_post";

export const MIN_QUOTE = 15;
const STEP_TEXT_MAX = 200;

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
const ACH: AchPush[] = ["yes", "no", "unclear"];
const KINDS: RequirementKind[] = ["dd", "deposit_hold", "open_account", "debit_txn", "enroll", "other"];

/** 값이 인용문 안에 실제로 들어 있는지 — 인용은 맞는데 엉뚱한 값을 붙인 경우를 거른다. */
export function valueInQuote(field: ScalarField, value: unknown, quote: string): boolean {
  switch (field) {
    case "dd_amount":
    case "deposit_hold_amount":
    case "dd_days":
    case "deposit_hold_days":
      return typeof value === "number" && Number.isInteger(value) && value > 0 && digitsIn(quote, value);
    case "churn_months":
      return typeof value === "number" && Number.isInteger(value) && value > 0 && /\b(?:month|year|day)s?\b/i.test(quote);
    case "reapply_once_only":
      return value === 1 ? /\b(?:once|one[- ]time|lifetime|only one|never|ever|previously)\b/i.test(quote) : value === 0 && /\b(?:month|year|day)s?\b/i.test(quote);
    case "expires_on": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const dates = quote.match(/(?:[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2}))/g) ?? [];
      return dates.some((d) => parseDate(d) === value);
    }
    case "apply_methods":
      return Array.isArray(value) && value.length > 0 && value.every((m) => METHODS.includes(m as ApplyMethod));
    case "ach_push":
      return ACH.includes(value as AchPush) && /\b(?:ACH|transfers?|electronic|direct deposits?)\b/i.test(quote);
    case "eligibility_text":
    case "fee_waiver_text":
    case "early_termination_text":
      // 글 필드는 인용 자체가 값 — 값이 인용의 일부여야 한다.
      return typeof value === "string" && value.trim().length > 0 && normalizeForMatch(quote).includes(normalizeForMatch(value).replace(/[.;:,]+$/, ""));
  }
}

export type Haystacks = { official: string | null; doc: string | null };

/** 인용 위치 — 공식 먼저, 그다음 DoC. 못 찾으면 null. */
function locate(quote: string, hay: Haystacks): MatchSource | null {
  const q = normalizeForMatch(quote).replace(/[.;:,]+$/, "");
  if (q.length < MIN_QUOTE) return null;
  if (hay.official && normalizeForMatch(hay.official).includes(q)) return "official";
  if (hay.doc && normalizeForMatch(hay.doc).includes(q)) return "doc_post";
  return null;
}

export type GateResult = { ok: true; quote: string; source: MatchSource } | { ok: false; reason: GateReason };

/** 단일 값 필드 판정. */
export function checkEvidence(field: ScalarField, value: unknown, quote: string | null | undefined, hay: Haystacks): GateResult {
  if (!quote || !quote.trim()) return { ok: false, reason: "no_evidence" };
  const source = locate(quote, hay);
  if (!source) return { ok: false, reason: "quote_not_found" };
  const q = normalizeForMatch(quote);
  if (!valueInQuote(field, value, q)) return { ok: false, reason: "value_not_in_quote" };
  return { ok: true, quote: quote.trim().slice(0, 500), source };
}

export const isTextField = (f: ExtractField) => TEXT_FIELDS.has(f);

/**
 * 조건 체크리스트 판정 — 단계마다 인용 확인, 금액·일수가 있으면 인용 안에 있어야 한다.
 * 출처는 모든 단계가 공식에서 확인되면 official, 아니면 doc_post (공식만으로 확인된 체크리스트가 아니므로).
 */
export function checkRequirements(
  steps: unknown,
  quotes: (string | null | undefined)[],
  hay: Haystacks,
): { ok: true; steps: RequirementStep[]; source: MatchSource } | { ok: false; reason: GateReason } {
  if (!Array.isArray(steps) || !steps.length) return { ok: false, reason: "value_not_in_quote" };
  const out: RequirementStep[] = [];
  let allOfficial = true;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i] as Partial<RequirementStep> & { quote?: string };
    const quote = st.quote ?? quotes[i];
    if (!quote || !quote.trim()) return { ok: false, reason: "no_evidence" };
    const source = locate(quote, hay);
    if (!source) return { ok: false, reason: "quote_not_found" };
    const q = normalizeForMatch(quote);
    const shapeOk =
      (st.portion === "base" || st.portion === "extra") &&
      KINDS.includes(st.kind as RequirementKind) &&
      typeof st.text === "string" &&
      st.text.trim().length > 0 &&
      st.text.length <= STEP_TEXT_MAX;
    const numsOk =
      (st.amount == null || (Number.isInteger(st.amount) && digitsIn(q, st.amount))) &&
      (st.days == null || (Number.isInteger(st.days) && digitsIn(q, st.days)));
    if (!shapeOk || !numsOk) return { ok: false, reason: "value_not_in_quote" };
    if (source !== "official") allOfficial = false;
    out.push({
      order: typeof st.order === "number" ? st.order : i + 1,
      portion: st.portion!,
      kind: st.kind!,
      text: st.text!.trim(),
      amount: st.amount ?? null,
      days: st.days ?? null,
      count: st.count ?? null,
      tiered: st.tiered ?? false,
      quote: quote.trim().slice(0, 500),
      source,
      via: "cowork",
    });
  }
  out.sort((a, b) => (a.portion === b.portion ? a.order - b.order : a.portion === "base" ? -1 : 1));
  return { ok: true, steps: out.map((x, i) => ({ ...x, order: i + 1 })), source: allOfficial ? "official" : "doc_post" };
}

/** DoC 쪽 원문 — 요약 + 약관 (export가 내보낸 묶음과 같다). */
export function sourceText(glance: string | null, finePrint: string | null): string {
  return [glance ? `Offer at a glance:\n${glance}` : "", finePrint ?? ""].join("\n\n");
}
