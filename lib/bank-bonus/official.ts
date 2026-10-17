/**
 * 은행 공식 오퍼 페이지 — bb_offer_details.bank_offer_url (DoC "Direct link to offer").
 * 보이는 글자만 남긴다: script·style·nav·header·footer 등 제거, 블록 태그는 줄바꿈.
 * 24000자를 넘으면 약관·오퍼 상세·자격·보너스 단어가 처음 나오는 구간부터 자른다.
 * 많은 은행 페이지가 자바스크립트로 그려져 서버 HTML에 약관이 없다 — 그런 경우 "unusable"로 남긴다(추측 금지).
 */

import { findChurn } from "./detail";
import { membershipSentence } from "./derive";
import { decodeEntities } from "./text";
import { BLOCK_MARKERS } from "./http";
import type { OfficialFields } from "./types";

export const OFFICIAL_TEXT_MAX = 24_000;
const MIN_USABLE = 400;

export function officialText(html: string): string {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe|nav|header|footer|form|button|select)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(?:br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|tr|td|th|section|article|dd|dt|ul|ol|table|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  const lines = decodeEntities(cleaned)
    .replace(/ /g, " ")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  // 메뉴·반복 문구 줄이기 — 바로 앞 줄과 같은 줄은 버린다.
  const out: string[] = [];
  for (const l of lines) if (l !== out.at(-1)) out.push(l);
  const text = out.join("\n");
  if (text.length <= OFFICIAL_TEXT_MAX) return text;
  const idx = text.search(/terms and conditions|offer terms|offer details|promotion(?:al)? terms|eligibility|bonus/i);
  const start = idx > 0 ? Math.max(0, idx - 2_000) : 0;
  return text.slice(start, start + OFFICIAL_TEXT_MAX);
}

/** 쓸 만한 본문인지 — 200, 막힘 표지 없음, 400자 이상, 보너스·오퍼 단어. 아니면 사유. */
export function officialUsability(status: number, html: string, text: string): string | null {
  if (status !== 200) return `HTTP ${status}`;
  const markers = BLOCK_MARKERS.filter((m) => m !== "captcha" && html.includes(m));
  if (markers.length && text.length < 4_000) return `blocked (${markers.join(", ")})`;
  if (text.length < MIN_USABLE) return `too little text (${text.length} chars; page likely rendered by script)`;
  if (!/\b(?:bonus|offer|promotion)\b/i.test(text)) return "no bonus/offer wording in visible text";
  return null;
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 공식 본문에서 정규식으로 확실한 것만: 재신청 기간(개인 계좌면 business 문장 제외), 1회 한정, 회원 자격 제한.
 * 값마다 출처 문장을 인용으로 남긴다 (method='regex').
 */
export function officialRegexFields(text: string, personal: boolean): OfficialFields {
  const out: OfficialFields = {};
  const churn = findChurn(text, { personal });
  if (churn.months != null && churn.text) {
    out.churn_months = { value: churn.months, quote: churn.text, method: "regex" };
  }
  const once = text
    .split(/(?<=[.!?])\s+|\n+/)
    // 평생 1회만 — "limit one bonus per customer"(행사 기간 중 1회)는 재신청 불가가 아니라서 넣지 않는다.
    .find((s) => /\b(?:one|1)\s+(?:new account |checking |savings )?(?:bonus|offer|promotion)\s+per\s+lifetime\b|\bonce per lifetime\b|\bonce in a lifetime\b|\bhave never (?:received|been paid) (?:a|an)\b/i.test(s));
  if (once && (!personal || !/\bbusiness\b/i.test(once))) out.reapply_once_only = { value: 1, quote: once.trim().slice(0, 500), method: "regex" };
  const elig = membershipSentence(text);
  if (elig) out.eligibility_text = { value: elig, quote: elig, method: "regex" };
  return out;
}
