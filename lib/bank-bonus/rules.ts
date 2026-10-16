/**
 * 판정 규칙 — 점수 없음. 상세 글 값(bb_offer_details)이 있으면 우선, 없으면 master 불릿 값.
 *
 * "지금 할 만한 오퍼"(doable) = 입출금 AND (전국 OR CA 가능) AND 예치금 묶임 없음 AND 내 거래 은행 아님
 *   AND 타겟 아님 AND 계좌 오퍼 AND active(목록에 있음 + 상세 글이 [Expired] 아님) AND 숨김·신청 완료 아님.
 * 태그는 코드 + 숫자만 — 문구는 화면(messages.ts)이 만든다.
 */

import { SCORE, existingBanks } from "./config";
import type { EvaluatedOffer, MergedOffer, OfferDetail, OfferFlags, OfferTag } from "./types";

const DAY = 86_400_000;
const NO_FLAGS: OfferFlags = { star: 0, hidden: 0, applied: 0, note: null };

export function existingBankOf(bank: string | null): { name: string; note: string } | null {
  if (!bank) return null;
  const b = bank.toLowerCase();
  return existingBanks.find((e) => b.includes(e.name.toLowerCase())) ?? null;
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

export function evaluateOffer(
  o: MergedOffer,
  flags: OfferFlags | undefined,
  detail: OfferDetail | undefined,
  now = Date.now(),
): EvaluatedOffer {
  const f = flags ?? NO_FLAGS;
  const d = detail;
  const applyMethods =
    d?.apply_methods ?? (o.inBranch === 1 ? ["branch" as const] : o.inBranch === 0 ? ["online" as const] : null);
  const ddAmount = d?.dd_amount ?? o.ddAmount;
  const ddDays = d?.dd_days ?? o.ddDays;
  // 상세 글이 DD 금액/기간을 말하면 DD 필요로 본다. 그 밖엔 master 판정.
  const ddRequired = d?.dd_amount != null || d?.dd_days != null ? 1 : o.ddRequired;
  const expiresOn = d?.expires_on ?? o.expiresOn;
  const postExpired = d?.post_expired === 1;
  const cc = ccFunding(o.ccFundingText);
  const inBranch = o.inBranch === 1 || (!!applyMethods?.includes("branch") && !applyMethods.includes("online"));

  const tags: OfferTag[] = [];
  if (o.depositHoldAmount != null) tags.push({ code: "hold", amount: o.depositHoldAmount, days: o.depositHoldDays });
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
    o.depositHoldAmount == null &&
    !existingBankOf(o.bank) &&
    o.targeted !== 1 &&
    o.isOffer &&
    !postExpired &&
    !f.hidden &&
    !f.applied;

  return {
    ...o,
    ddRequired,
    ddAmount,
    ddDays,
    ddText: d?.dd_text ?? o.ddText,
    expiresOn,
    applyMethods,
    churnMonths: d?.churn_months ?? null,
    churnText: d?.churn_text ?? null,
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
