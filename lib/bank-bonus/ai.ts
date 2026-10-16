/**
 * 근거 있는 AI 추출 — 정규식이 못 채운 필드만, 보낸 원문에서 그대로 찾을 수 있는 인용이 있을 때만 받아들인다.
 *
 * 클라이언트: 공식 @anthropic-ai/sdk (이미 의존성). lib/ai/analyze.ts의 anthropic provider는 아직 미구현 스텁이라
 * 재사용하지 않고 여기서 최소 호출만 둔다. 키는 Worker env ANTHROPIC_API_KEY — 로그·응답에 절대 싣지 않는다.
 */

import Anthropic from "@anthropic-ai/sdk";
import { parseDate } from "./detail";
import type { ApplyMethod } from "./types";

export const AI_MODEL = "claude-haiku-5-5";
export const AI_INPUT_MAX = 6000;

export const AI_FIELDS = [
  "expires_on",
  "churn_months",
  "dd_amount",
  "dd_days",
  "deposit_hold_amount",
  "deposit_hold_days",
  "apply_methods",
] as const;
export type AiField = (typeof AI_FIELDS)[number];

export type AiRaw = {
  expires_on: string | null;
  churn_months: number | null;
  churn_text: string | null;
  dd_amount: number | null;
  dd_days: number | null;
  deposit_hold_amount: number | null;
  deposit_hold_days: number | null;
  apply_methods: ApplyMethod[] | null;
  evidence: Partial<Record<AiField, string | null>>;
};

const nullable = (type: string) => ({ type: [type, "null"] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...AI_FIELDS, "churn_text", "evidence"],
  properties: {
    expires_on: { ...nullable("string"), description: "Last day to open/enroll, YYYY-MM-DD" },
    churn_months: { ...nullable("integer"), description: "Months before a previous customer/bonus recipient is eligible again" },
    churn_text: nullable("string"),
    dd_amount: { ...nullable("integer"), description: "Minimum total direct deposit in USD for the base bonus" },
    dd_days: { ...nullable("integer"), description: "Days allowed to complete the direct deposit" },
    deposit_hold_amount: { ...nullable("integer"), description: "New money that must be deposited and kept, in USD" },
    deposit_hold_days: { ...nullable("integer"), description: "Days that money must be kept" },
    apply_methods: {
      anyOf: [{ type: "array", items: { type: "string", enum: ["online", "branch", "code", "invite"] } }, { type: "null" }],
    },
    evidence: {
      type: "object",
      additionalProperties: false,
      required: [...AI_FIELDS],
      properties: Object.fromEntries(AI_FIELDS.map((f) => [f, nullable("string")])),
    },
  },
};

const SYSTEM = [
  "You extract bank account bonus terms from the text you are given. Use only that text.",
  "For every field you fill, put in evidence[field] one sentence copied exactly, character for character, from the text that states the value.",
  "If the text does not clearly state a value, return null for the field and its evidence. Do not infer or estimate.",
  "Amounts are whole US dollars. churn_months converts years to months (two years = 24).",
].join(" ");

/** API 호출 1회. 실패는 throw (호출부가 건별로 잡는다). */
export async function requestAiExtraction(apiKey: string, text: string): Promise<AiRaw> {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 30_000 });
  const res = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: text }],
  });
  if (res.stop_reason === "refusal") throw new Error("model declined");
  if (res.stop_reason === "max_tokens") throw new Error("response cut off");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("no text block");
  return JSON.parse(block.text) as AiRaw;
}

// ───────── 근거 대조 ─────────

/** 공백·따옴표·대시 차이만 무시. */
export function normalizeForMatch(s: string): string {
  return s
    .replace(/[“”″]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const MIN_QUOTE = 15;

function digitsIn(quote: string, n: number): boolean {
  const plain = quote.replace(/,/g, "");
  return new RegExp(`(?<![\\d])${n}(?![\\d])`).test(plain);
}

/** 값이 인용문 안에 실제로 들어 있는지 — 인용은 맞는데 엉뚱한 값을 붙이는 경우를 거른다. */
function valueInQuote(field: AiField, value: unknown, quote: string): boolean {
  switch (field) {
    case "dd_amount":
    case "deposit_hold_amount":
    case "dd_days":
    case "deposit_hold_days":
      return typeof value === "number" && digitsIn(quote, value);
    case "churn_months":
      return typeof value === "number" && /\b(?:month|year|day)s?\b/i.test(quote);
    case "expires_on": {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const dates = quote.match(/(?:[A-Za-z]{3,9}\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2}))/g) ?? [];
      return dates.some((d) => parseDate(d) === value);
    }
    case "apply_methods":
      return Array.isArray(value) && value.length > 0;
  }
}

export type AiAccepted = {
  values: Partial<Pick<AiRaw, AiField | "churn_text">>;
  evidence: Partial<Record<AiField, string>>;
  accepted: AiField[];
  discarded: AiField[];
};

/**
 * 비어 있는 필드(only)에 대해서만 판정. 근거 인용이 보낸 원문에 그대로 있고(공백 무시) 값이 그 인용에 들어 있을 때만 채택.
 */
export function acceptWithEvidence(raw: AiRaw, sentText: string, wanted: readonly AiField[]): AiAccepted {
  const haystack = normalizeForMatch(sentText);
  const out: AiAccepted = { values: {}, evidence: {}, accepted: [], discarded: [] };
  for (const field of wanted) {
    const value = raw[field];
    if (value == null || (Array.isArray(value) && !value.length)) continue; // 모델도 모른다고 함 — 채택·폐기 아님
    const quote = raw.evidence?.[field];
    const q = quote ? normalizeForMatch(quote).replace(/[.;:,]+$/, "") : "";
    if (q.length >= MIN_QUOTE && haystack.includes(q) && valueInQuote(field, value, q)) {
      (out.values as Record<string, unknown>)[field] = value;
      out.evidence[field] = quote!.trim().slice(0, 500);
      out.accepted.push(field);
      if (field === "churn_months" && raw.churn_text) out.values.churn_text = raw.churn_text.slice(0, 500);
    } else {
      out.discarded.push(field);
    }
  }
  return out;
}
