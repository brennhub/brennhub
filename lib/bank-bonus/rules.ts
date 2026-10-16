/**
 * 판정 규칙 — 점수 없음. 상세 글 값(bb_offer_details)이 있으면 우선, 없으면 master 불릿 값.
 *
 * "지금 할 만한 오퍼"(doable) = 입출금 AND (전국 OR CA 가능) AND 기본 보너스에 예치금 묶임 없음 AND 내 거래 은행 아님
 *   AND 타겟 아님 AND 계좌 오퍼 AND active(목록에 있음 + 상세 글이 [Expired] 아님) AND 숨김·신청 완료 아님.
 * 겹친 오퍼(예: 입출금 $300 + 저축 예치 시 총 $900)는 기본 부분에 예치가 없으면 할 만한 오퍼로 남는다 — 예치는 겹친 부분 몫.
 * 정렬 금액 = 기본 금액(bonus_base), 모르면 bonus_max.
 *
 * 재신청 가능 표시 우선순위: manual > official > doc_post > doc_churn > cowork.
 * 태그는 코드 + 숫자만 — 문구는 화면(messages.ts)이 만든다.
 */

import { bankMatches } from "./banks";
import { SCORE, existingBanks } from "./config";
import type { BankRule, EvaluatedOffer, Evidence, MergedOffer, OfferDetail, OfferFlags, OfferTag, RuleSource } from "./types";

const DAY = 86_400_000;
const NO_FLAGS: OfferFlags = { star: 0, hidden: 0, applied: 0, note: null };
export const CHURN_LIST_URL = "https://www.doctorofcredit.com/a-list-of-churnable-bank-account-bonuses/";

export function existingBankOf(bank: string | null): { name: string; note: string } | null {
  return existingBanks.find((e) => bankMatches(bank, e.name)) ?? null;
}

/** "No credit card funding" → 0 · "Can fund up to $500 with a credit card" → 1 + 500. 직불카드만 언급은 판정 불가. */
export function ccFunding(text: string | null): { allowed: 0 | 1 | null; max: number | null } {
  if (!text) return { allowed: null, max: null };
  if (/\bno credit card funding\b|credit card funding (?:is )?not allowed|cannot fund with (?:a )?credit/i.test(text)) {
    return { allowed: 0, max: null };
  }
  if (/credit card/i.test(text)) {
    const m = text.match(/up to \$([\d,]+)/i) ?? text.match(/\$([\d,]+)/);
    return { allowed: 1, max: m ? parseInt(m[1].replace(/,/g, ""), 10) : null };
  }
  return { allowed: null, max: null };
}

export function daysUntil(isoDate: string, now: number): number {
  return (Date.parse(`${isoDate}T23:59:59Z`) - now) / DAY;
}

const RULE_ORDER: RuleSource[] = ["manual", "official", "doc_post", "doc_churn", "cowork"];

/** 재신청 — 층별 후보 중 우선순위가 가장 높은 값. */
function resolveReapply(
  o: MergedOffer,
  d: OfferDetail | undefined,
  rules: BankRule[],
): EvaluatedOffer["reapply"] & { text: string | null } {
  const detailRead = !!d && d.http_status != null && d.http_status >= 200 && d.http_status < 300;
  const postMethod = d?.evidence?.churn_months?.method;
  const candidates: { source: RuleSource; months: number; text: string | null; quote: string | null; url: string | null }[] = [];

  for (const r of rules) {
    if (r.churn_months == null || !bankMatches(o.bank, r.bank)) continue;
    // doc_post 은행 규칙은 다른 글(같은 은행 다른 상품)에서 왔을 수 있다 — 이 오퍼의 글이 우선이라 여기선 건너뜀.
    if (r.source === "doc_post") continue;
    // DoC 처닝 목록은 개인 계좌 기준 — 사업자 오퍼에는 붙이지 않는다.
    if (r.source === "doc_churn" && o.accountType === "business") continue;
    candidates.push({ source: r.source, months: r.churn_months, text: r.churn_text, quote: r.evidence ?? r.churn_text, url: r.source_url });
  }
  if (d?.churn_months != null) {
    candidates.push({
      source: postMethod === "cowork" ? "cowork" : "doc_post",
      months: d.churn_months,
      text: d.churn_text,
      quote: d.evidence?.churn_months?.quote ?? d.churn_text,
      url: d.detail_url,
    });
  }
  candidates.sort((a, b) => RULE_ORDER.indexOf(a.source) - RULE_ORDER.indexOf(b.source));
  const best = candidates[0];
  if (best) {
    return {
      state: "value",
      months: best.months,
      text: best.text,
      evidence: best.quote ? { quote: best.quote, source: best.source, url: best.url ?? (best.source === "doc_churn" ? CHURN_LIST_URL : null) } : null,
    };
  }
  return { state: detailRead ? "not_stated" : "unknown", months: null, text: null, evidence: null };
}

function detailEvidence(d: OfferDetail | undefined, key: string): Evidence | undefined {
  const e = d?.evidence?.[key];
  return e ? { quote: e.quote, source: e.method === "cowork" ? "cowork" : "doc_post", url: d?.detail_url ?? null } : undefined;
}

export function evaluateOffer(
  o: MergedOffer,
  flags: OfferFlags | undefined,
  detail: OfferDetail | undefined,
  rules: BankRule[] = [],
  now = Date.now(),
): EvaluatedOffer {
  const f = flags ?? NO_FLAGS;
  const d = detail;
  const detailRead = !!d && d.http_status != null && d.http_status >= 200 && d.http_status < 300;
  const applyMethods =
    d?.apply_methods ?? (o.inBranch === 1 ? ["branch" as const] : o.inBranch === 0 ? ["online" as const] : null);
  const ddAmount = d?.dd_amount ?? o.ddAmount;
  const ddDays = d?.dd_days ?? o.ddDays;
  // 상세 글이 DD 금액/기한을 말하면 DD 필요로 본다. 그 밖엔 master 판정.
  const ddRequired = d?.dd_amount != null || d?.dd_days != null ? 1 : o.ddRequired;
  const expiresOn = d?.expires_on ?? o.expiresOn;
  const postExpired = d?.post_expired === 1;
  const cc = ccFunding(o.ccFundingText);
  const inBranch = o.inBranch === 1 || (!!applyMethods?.includes("branch") && !applyMethods.includes("online"));

  // 겹친 오퍼 — 상세 글 값 우선, 없으면 master 제목("($900 With Savings)").
  const bonusBase = d?.bonus_base ?? o.bonusBase;
  const bonusTotalWithDeposit = d?.bonus_total_with_deposit ?? o.bonusTotalWithDeposit;
  const bonusTotalNote = d?.bonus_total_note ?? o.bonusTotalNote;
  // 저축을 겹친 오퍼("with savings")거나 상세 글이 예치를 겹친 부분 몫(extra)이라 하면, 예치는 기본 보너스를 막지 않는다.
  const stackedExtra =
    d?.deposit_hold_scope === "extra" || (d?.deposit_hold_scope !== "base" && bonusTotalNote === "savings" && bonusTotalWithDeposit != null);
  // 기본 보너스에 걸린 예치: 겹친 오퍼면 없음, 아니면 상세 글(정규식·AI) → master 판정.
  const baseHoldAmount = stackedExtra ? null : (d?.deposit_hold_amount ?? o.depositHoldAmount);
  const baseHoldDays = stackedExtra ? null : (d?.deposit_hold_days ?? o.depositHoldDays);
  const extraHoldAmount = stackedExtra ? (d?.deposit_hold_amount ?? o.depositHoldAmount) : null;
  const extraHoldDays = stackedExtra ? (d?.deposit_hold_days ?? o.depositHoldDays) : null;

  const tags: OfferTag[] = [];
  if (baseHoldAmount != null) tags.push({ code: "hold", amount: baseHoldAmount, days: baseHoldDays });
  if (inBranch) tags.push({ code: "branch" });
  if (o.hardPull === 1) tags.push({ code: "hardPull" });
  if (o.targeted === 1 || applyMethods?.includes("invite")) tags.push({ code: "targeted" });
  if (o.seenAfterBaseline && now - Date.parse(o.firstSeenAt) <= SCORE.newDays * DAY) tags.push({ code: "new" });
  if (expiresOn) {
    const left = daysUntil(expiresOn, now);
    if (left >= 0 && left <= SCORE.expiringDays) tags.push({ code: "expiring" });
  }

  const doable =
    o.accountType === "checking" &&
    (o.nationwide === 1 || o.caEligible === 1) &&
    baseHoldAmount == null &&
    !existingBankOf(o.bank) &&
    o.targeted !== 1 &&
    o.isOffer &&
    !postExpired &&
    !f.hidden &&
    !f.applied;

  const reapply = resolveReapply(o, d, rules);
  const evidence: EvaluatedOffer["evidence"] = {};
  if (d?.expires_on) evidence.expires = detailEvidence(d, "expires_on");
  if (d?.dd_amount != null || d?.dd_days != null) evidence.requirement = detailEvidence(d, "dd") ?? detailEvidence(d, "dd_amount") ?? detailEvidence(d, "dd_days");

  return {
    ...o,
    bonusBase,
    bonusTotalWithDeposit,
    bonusTotalNote,
    sortBonus: bonusBase ?? o.bonusMax ?? o.bonusMin,
    depositHoldAmount: baseHoldAmount,
    depositHoldDays: baseHoldDays,
    extraHoldAmount,
    extraHoldDays,
    ddRequired,
    ddAmount,
    ddDays,
    ddText: d?.dd_text ?? o.ddText,
    expiresOn,
    applyMethods,
    churnMonths: reapply.months,
    churnText: reapply.text,
    reapply: { state: reapply.state, months: reapply.months, evidence: reapply.evidence },
    evidence,
    detailRead,
    earlyTerminationText: d?.early_termination_text ?? null,
    monthlyFeeText: d?.monthly_fee_text ?? null,
    bankOfferUrl: d?.bank_offer_url ?? null,
    postExpired,
    ccFundingAllowed: cc.allowed,
    ccFundingMax: cc.max,
    doable,
    tags,
    flags: f,
    detailFetchedAt: d?.fetched_at ?? null,
  };
}
