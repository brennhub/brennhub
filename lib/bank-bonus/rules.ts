/**
 * 판정 규칙 — 점수 없음. 상세 글 값(bb_offer_details)이 있으면 우선, 없으면 master 불릿 값.
 *
 * "지금 할 만한 오퍼"(doable) = 입출금 AND (전국 OR CA 가능) AND 기본 보너스에 예치금 묶임 없음 AND 내 거래 은행 아님
 *   AND 타겟 아님 AND 계좌 오퍼 AND active(목록에 있음 + 상세 글이 [Expired] 아님) AND 숨김·신청 완료 아님.
 * 겹친 오퍼(예: 입출금 $300 + 저축 예치 시 총 $900)는 기본 부분에 예치가 없으면 할 만한 오퍼로 남는다 — 예치는 겹친 부분 몫.
 * 정렬 금액 = 기본 금액(bonus_base), 모르면 bonus_max.
 *
 * 표시 우선순위: manual > official(공식 약관) > doc_post(DoC 글, 정규식·Cowork) > doc_churn. 재신청 기간은 공식·DoC 글 중 긴 쪽.
 * 가입 자격 제한(군인·고용주·카운티·학교 등)이 있으면 할 만한 오퍼에서 뺀다.
 * 태그는 코드 + 숫자만 — 문구는 화면(messages.ts)이 만든다.
 */

import { bankMatches } from "./banks";
import { SCORE, existingBanks } from "./config";
import { restrictionOf } from "./eligibility";
import type {
  AchPush,
  ApplyMethod,
  BankRule,
  EvaluatedOffer,
  Evidence,
  MergedOffer,
  OfferDetail,
  OfferFlags,
  OfferTag,
  OfficialPage,
  RequirementStep,
  RuleSource,
} from "./types";

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

/** DoC 약관이 글의 최신 Update보다 오래됐는가 — 게시일 뒤에 Update가 붙은 글. */
function docIsStale(d: OfferDetail | undefined): boolean {
  return !!d?.doc_updated_at && !!d.doc_posted_at && d.doc_updated_at > d.doc_posted_at;
}

/** 공식 약관 값 (official_fields) → 값 + 근거. */
function officialValue<T>(d: OfferDetail | undefined, key: string, page: OfficialPage | undefined): { value: T; evidence: Evidence } | null {
  const f = d?.official_fields?.[key];
  if (!f || f.value == null) return null;
  return {
    value: f.value as T,
    evidence: { quote: f.quote, quote_ko: f.quote_ko ?? null, source: "official", url: page?.url ?? d?.bank_offer_url ?? null, via: f.method },
  };
}

/** DoC 상세 칸 값 → 값 + 근거 (근거 방식이 cowork면 via=cowork). 오래된 약관이면 stale. */
function docValue<T>(d: OfferDetail | undefined, value: T | null | undefined, evidenceKey: string): { value: T; evidence: Evidence | null } | null {
  if (!d || value == null) return null;
  const e = d.evidence?.[evidenceKey];
  return {
    value,
    evidence: e
      ? { quote: e.quote, quote_ko: e.quote_ko ?? null, source: "doc_post", url: e.url ?? d.detail_url, via: e.method === "cowork" ? "cowork" : "regex", stale: docIsStale(d) }
      : null,
  };
}

/**
 * 재신청 — 직접 입력 규칙 > (공식·DoC) "1회 한정" > (공식·DoC 글) 기간 > DoC 처닝 목록.
 * 공식과 DoC 글이 서로 다른 기간을 말하면 긴 쪽 — 둘 다 지켜야 하는 조건이다
 * (예: Chase 공식 페이지 "closed within 90 days" vs DoC 약관 "one bonus every two years" → 24개월).
 */
function resolveReapply(
  o: MergedOffer,
  d: OfferDetail | undefined,
  rules: BankRule[],
  page: OfficialPage | undefined,
): EvaluatedOffer["reapply"] & { text: string | null } {
  const detailRead = !!d && d.http_status != null && d.http_status >= 200 && d.http_status < 300;
  const officialRead = !!page?.text;
  type C = { source: RuleSource; months: number; text: string | null; quote: string | null; url: string | null; via?: "regex" | "cowork"; stale?: boolean };
  const bankRules: C[] = [];
  for (const r of rules) {
    if (r.churn_months == null || !bankMatches(o.bank, r.bank)) continue;
    // doc_post 은행 규칙은 다른 글(같은 은행 다른 상품)에서 왔을 수 있다 — 이 오퍼의 글이 우선이라 여기선 건너뜀.
    if (r.source === "doc_post") continue;
    // DoC 처닝 목록은 개인 계좌 기준 — 사업자 오퍼에는 붙이지 않는다.
    if (r.source === "doc_churn" && o.accountType === "business") continue;
    bankRules.push({ source: r.source, months: r.churn_months, text: r.churn_text, quote: r.evidence ?? r.churn_text, url: r.source_url });
  }
  const manual = bankRules.find((c) => c.source === "manual");
  const pack = (c: C) => ({
    state: "value" as const,
    months: c.months,
    text: c.text,
    evidence: c.quote
      ? { quote: c.quote, source: c.source, url: c.url ?? (c.source === "doc_churn" ? CHURN_LIST_URL : null), via: c.via, stale: c.stale }
      : null,
  });
  if (manual) return pack(manual);

  // 1회 한정 (공식 먼저).
  const onceOfficial = officialValue<number>(d, "reapply_once_only", page);
  const onceDoc = docValue(d, d?.reapply_once_only, "reapply_once_only");
  const once = onceOfficial?.value === 1 ? onceOfficial : onceDoc?.value === 1 ? onceDoc : null;
  if (once) return { state: "once_only", months: null, text: once.evidence?.quote ?? null, evidence: once.evidence };

  const windows: C[] = bankRules.filter((c) => c.source === "official");
  const offMonths = officialValue<number>(d, "churn_months", page);
  if (offMonths) {
    const t = d?.official_fields?.churn_text?.value;
    windows.push({ source: "official", months: offMonths.value, text: typeof t === "string" ? t : offMonths.evidence.quote, quote: offMonths.evidence.quote, url: offMonths.evidence.url, via: offMonths.evidence.via });
  }
  if (d?.churn_months != null) {
    const e = d.evidence?.churn_months;
    windows.push({
      source: "doc_post",
      months: d.churn_months,
      text: d.churn_text,
      quote: e?.quote ?? d.churn_text,
      url: d.detail_url,
      via: e?.method === "cowork" ? "cowork" : "regex",
      stale: docIsStale(d),
    });
  }
  if (windows.length) {
    const longest = windows.sort((a, b) => b.months - a.months || RULE_ORDER.indexOf(a.source) - RULE_ORDER.indexOf(b.source))[0];
    return pack(longest);
  }
  const listRule = bankRules.find((c) => c.source === "doc_churn");
  if (listRule) return pack(listRule);
  return { state: officialRead ? "official_not_stated" : detailRead ? "not_stated" : "unknown", months: null, text: null, evidence: null };
}

/** 조건 체크리스트 — 공식 약관(Cowork) > DoC(정규식·Cowork). 단계 근거는 단계마다. */
function resolveRequirements(d: OfferDetail | undefined, page: OfficialPage | undefined): { steps: RequirementStep[] | null; source: RuleSource | null } {
  const off = officialValue<RequirementStep[]>(d, "requirements", page);
  if (off && Array.isArray(off.value) && off.value.length) return { steps: off.value, source: "official" };
  if (d?.requirements_json?.length) return { steps: d.requirements_json, source: "doc_post" };
  return { steps: null, source: null };
}

export function evaluateOffer(
  o: MergedOffer,
  flags: OfferFlags | undefined,
  detail: OfferDetail | undefined,
  rules: BankRule[] = [],
  page?: OfficialPage,
  now = Date.now(),
): EvaluatedOffer {
  const f = flags ?? NO_FLAGS;
  const d = detail;
  const detailRead = !!d && d.http_status != null && d.http_status >= 200 && d.http_status < 300;

  const offMethods = officialValue<ApplyMethod[]>(d, "apply_methods", page);
  const applyMethods =
    offMethods?.value ?? d?.apply_methods ?? (o.inBranch === 1 ? ["branch" as const] : o.inBranch === 0 ? ["online" as const] : null);

  const offDdAmount = officialValue<number>(d, "dd_amount", page);
  const offDdDays = officialValue<number>(d, "dd_days", page);
  const ddAmount = offDdAmount?.value ?? d?.dd_amount ?? o.ddAmount;
  const ddDays = offDdDays?.value ?? d?.dd_days ?? o.ddDays;
  // 상세 글·공식 약관이 DD 금액/기한을 말하면 DD 필요로 본다. 그 밖엔 master 판정.
  const ddRequired = ddAmount != null && (offDdAmount || d?.dd_amount != null) ? 1 : d?.dd_days != null || offDdDays ? 1 : o.ddRequired;

  const offExpires = officialValue<string>(d, "expires_on", page);
  const expiresOn = offExpires?.value ?? d?.expires_on ?? o.expiresOn;
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
  const offHold = officialValue<number>(d, "deposit_hold_amount", page);
  const holdAmount = offHold?.value ?? d?.deposit_hold_amount ?? o.depositHoldAmount;
  const holdDays = officialValue<number>(d, "deposit_hold_days", page)?.value ?? d?.deposit_hold_days ?? o.depositHoldDays;
  const baseHoldAmount = stackedExtra ? null : holdAmount;
  const baseHoldDays = stackedExtra ? null : holdDays;
  const extraHoldAmount = stackedExtra ? holdAmount : null;
  const extraHoldDays = stackedExtra ? holdDays : null;

  // 직접입금 한 숫자가 표시 보너스의 전체 조건이 아닐 때 — 금액이 범위·등급이거나, 보너스 자체가 범위인데 기본 금액을 모를 때.
  const req = resolveRequirements(d, page);
  const tieredBonus = bonusBase == null && o.bonusMin != null && o.bonusMax != null && o.bonusMin !== o.bonusMax;
  const ddTiered = o.ddTiered || tieredBonus || !!req.steps?.some((s) => s.kind === "dd" && s.tiered);

  // 가입 자격 — 공식 먼저.
  const offElig = officialValue<string>(d, "eligibility_text", page);
  const docElig = docValue(d, d?.eligibility_text, "eligibility_text");
  const elig = offElig ?? docElig;
  // 내 지역(LA)·"누구나 가입" 문구를 보고 판정 — 사유는 태그 툴팁에.
  const restriction = restrictionOf(elig?.value ?? null);
  const restricted = !!restriction;

  // ACH 이체 인정 — 공식 먼저.
  const offAch = officialValue<AchPush>(d, "ach_push", page);
  const docAch = docValue(d, d?.ach_push, "ach_push");
  const ach = offAch ?? docAch;

  const tags: OfferTag[] = [];
  if (baseHoldAmount != null) tags.push({ code: "hold", amount: baseHoldAmount, days: baseHoldDays });
  if (inBranch) tags.push({ code: "branch" });
  if (o.hardPull === 1) tags.push({ code: "hardPull" });
  if (o.targeted === 1 || applyMethods?.includes("invite")) tags.push({ code: "targeted" });
  if (restriction) tags.push({ code: "membership", reason: restriction });
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
    !restricted &&
    o.isOffer &&
    !postExpired &&
    !f.hidden &&
    !f.applied;

  const reapply = resolveReapply(o, d, rules, page);
  const evidence: EvaluatedOffer["evidence"] = {};
  if (offExpires) evidence.expires = offExpires.evidence;
  else if (d?.expires_on) evidence.expires = docValue(d, d.expires_on, "expires_on")?.evidence ?? undefined;
  if (offDdAmount || offDdDays) evidence.requirement = (offDdAmount ?? offDdDays)!.evidence;
  else if (d?.dd_amount != null || d?.dd_days != null) {
    evidence.requirement =
      docValue(d, 1, "dd")?.evidence ?? docValue(d, 1, "dd_amount")?.evidence ?? docValue(d, 1, "dd_days")?.evidence ?? undefined;
  }

  // 공식 약관 최대 보너스 (Cowork, 공식 본문 근거) — 있으면 화면 금액·정렬 기준.
  const offMax = officialValue<number>(d, "bonus_official_max", page);
  const offNote = officialValue<string>(d, "bonus_official_note", page);

  const officialState: EvaluatedOffer["official"]["state"] = page?.text ? "usable" : page?.fetched_at ? "unavailable" : "none";

  return {
    ...o,
    bonusBase,
    bonusTotalWithDeposit,
    bonusTotalNote,
    sortBonus: offMax?.value ?? bonusBase ?? o.bonusMax ?? o.bonusMin,
    bonusOfficialMax: offMax?.value ?? null,
    bonusOfficialNote: offNote?.value ?? null,
    bonusOfficialEvidence: offMax?.evidence ?? null,
    depositHoldAmount: baseHoldAmount,
    depositHoldDays: baseHoldDays,
    extraHoldAmount,
    extraHoldDays,
    ddRequired,
    ddAmount: ddTiered ? null : ddAmount,
    ddDays,
    ddTiered,
    ddText: d?.dd_text ?? o.ddText,
    expiresOn,
    applyMethods,
    churnMonths: reapply.months,
    churnText: reapply.text,
    reapply: { state: reapply.state, months: reapply.months, evidence: reapply.evidence },
    evidence,
    requirements: req.steps,
    requirementsEvidenceSource: req.source,
    ach: { value: ach?.value ?? null, evidence: ach?.evidence ?? null },
    eligibility: { text: elig?.value ?? null, restricted, reason: restriction, evidence: elig?.evidence ?? null },
    official: { state: officialState, url: page?.url ?? d?.bank_offer_url ?? null },
    detailRead,
    earlyTerminationText: officialValue<string>(d, "early_termination_text", page)?.value ?? d?.early_termination_text ?? null,
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
