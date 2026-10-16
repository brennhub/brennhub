/**
 * DoC "A List Of Churnable Bank Account Bonuses" → 은행 단위 재신청 규칙 (bb_bank_rules, source='doc_churn').
 *
 * 구조 (2026-10 확인): 첫 <article> 안 <h2>Nationwide / State Specific</h2> → <h3>은행명[ – 주 목록]</h3> →
 * 공식 문구 인용(<p>/<li>) 또는 독자 보고 링크("Yes: 1, 2", "Not churnable: 1").
 * 기간은 detail.ts의 재신청 창 규칙(findChurn)으로만 읽는다 — 독자 보고만 있으면 개월 수 null.
 * 목록은 개인 계좌 기준이라 "business" 문장은 쓰지 않고, 규칙도 사업자 오퍼에는 붙이지 않는다 (rules.ts).
 */

import { findChurn } from "./detail";
import { htmlToText } from "./text";

export type BankRuleInput = {
  bank: string;
  churnMonths: number | null;
  churnText: string | null;
  evidence: string | null;
};

const MAX_TEXT = 500;

export function parseChurnList(html: string): BankRuleInput[] {
  const a = html.search(/<article[\s>]/i);
  if (a < 0) throw new Error("article not found");
  const art = html.slice(a, html.indexOf("</article>", a) > a ? html.indexOf("</article>", a) : undefined);

  const heads = [...art.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const out: BankRuleInput[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < heads.length; i++) {
    if (heads[i][1] !== "3") continue;
    // "Atlantic Union Bank – VA, MD, NC" / "Santander NH, MA, RI, …" → 은행명만.
    const bank = htmlToText(heads[i][2])
      .split(/\s+[–—-]\s+/)[0]
      .replace(/\s+[A-Z]{2}(?:,|\s+(?:or|and|&)\s|$).*$/, "")
      .trim();
    if (!bank || seen.has(bank.toLowerCase())) continue;
    seen.add(bank.toLowerCase());

    const start = heads[i].index + heads[i][0].length;
    const bodyHtml = art.slice(start, heads[i + 1]?.index ?? art.length);
    // 문단·불릿을 따로 끊는다 — DoC 요약("within the last six months:")과 인용된 약관("last twelve (12) months")이
    // 한 문장으로 붙으면 앞쪽 창을 잘못 집는다. 약관 문장(offer/eligible)이 findChurn에서 우선.
    const blocks = [...bodyHtml.matchAll(/<(p|li)[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => htmlToText(m[2])).filter(Boolean);
    const body = blocks.length ? blocks.join("\n") : htmlToText(bodyHtml);
    // 목록 규칙은 개인 계좌 오퍼에 붙는다 — "business" 문장은 근거에서 뺀다.
    const churn = findChurn(body, { personal: true });
    out.push({
      bank,
      churnMonths: churn.months,
      churnText: (churn.text ?? body).slice(0, MAX_TEXT) || null,
      evidence: churn.text ? churn.text.slice(0, MAX_TEXT) : null,
    });
  }
  if (!out.length) throw new Error("no bank entries parsed");
  return out;
}
