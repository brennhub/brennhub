/**
 * 원문 → 조건 필드 파생. 전부 보수적 — 문구가 분명할 때만 값, 아니면 null.
 * 파서가 호출해 bb_offers 컬럼으로 저장한다 (merge/score는 저장된 값만 읽는다).
 */

import type { AccountType } from "./types";

const money = (s: string) => parseInt(s.replace(/[$,]/g, ""), 10);

/** 금액 범위·등급("$2,000-$8,000", "$1,000 to $4,999.99", "$250/$350/$450") — 한 숫자로 줄이면 부분값이 된다. */
export function isTieredAmount(text: string): boolean {
  return (
    /\$\d[\d,.]*\+?\s*(?:[-–—/]|to)\s*\$\d/i.test(text) ||
    (text.match(/to earn (?:the |a )?\$\d/gi) ?? []).length > 1 ||
    (text.match(/\$\d[\d,]*/g) ?? []).length > 2
  );
}

/**
 * "$1,000 direct deposit required" / "No direct deposit required".
 * 범위·등급("Direct deposit of $2,000-$8,000 required")은 amount를 비우고 tiered — 하한을 조건으로 쓰지 않는다.
 */
export function parseDd(text: string | null): { required: 0 | 1 | null; amount: number | null; days: number | null; tiered: boolean } {
  if (!text) return { required: null, amount: null, days: null, tiered: false };
  if (/\bno direct deposit|direct deposit (?:is )?not required|no dd\b/i.test(text)) {
    return { required: 0, amount: null, days: null, tiered: false };
  }
  if (!/direct deposit/i.test(text)) return { required: null, amount: null, days: null, tiered: false };
  const tiered = isTieredAmount(text);
  const amt = text.match(/\$\d[\d,]*/);
  const days = text.match(/(?:within|in|for)\s+(\d{1,3})\s+days/i);
  return { required: 1, amount: amt && !tiered ? money(amt[0]) : null, days: days ? Number(days[1]) : null, tiered };
}

/** "Valid through 1/27/27" · "expires 12/31/26" · "ends 11/30/2026" → YYYY-MM-DD. */
export function parseExpires(text: string): string | null {
  const m = text.match(/\b(?:valid (?:through|until)|expires?(?: on)?|ends?(?: on)?|deadline:?|until)\s+(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\b/i);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const mo = Number(m[1]);
  const d = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * 자금 묶임 — 한 문장 안에 $1,000 이상 금액 + 예치/유지 표현이 있을 때.
 * 기간: "$20,000 deposit for 60+ days", "maintain $15,000 from day 31 through 90", "for six months".
 * 기간 없는 "Requires a $100,000 deposit"도 묶임으로 본다 (days = null). 직접입금(DD) 문장은 제외.
 */
export function parseDepositHold(text: string): { amount: number | null; days: number | null } {
  for (const sentence of text.split(/(?<=[.;!?])\s+|\n/)) {
    if (!/\b(deposits?|maintain|keep|hold|balance|new money)\b/i.test(sentence)) continue;
    if (/direct deposit/i.test(sentence) && !/\b(new money|balance|maintain|keep)\b/i.test(sentence)) continue;
    // 예치 표현에 붙은 금액 우선 ("$100,000 deposit", "deposit of $35,000") — 문장 첫 금액은 보너스일 수 있다.
    const amt =
      sentence.match(/\$\d[\d,]*(?=\+?\s+(?:deposit|in new money|new money|balance))/i) ??
      sentence.match(/(?<=(?:deposit of|balance of|maintain(?: a)?(?: balance of)?|keep)\s+)\$\d[\d,]*/i) ??
      sentence.match(/\$\d[\d,]*/);
    if (!amt || money(amt[0]) < 1000) continue;
    const range = sentence.match(/day\s+(\d{1,3})\s+(?:through|to|-|–)\s+(?:day\s+)?(\d{1,3})/i);
    if (range) return { amount: money(amt[0]), days: Number(range[2]) - Number(range[1]) + 1 };
    const days = sentence.match(/(?:for|at least|minimum of)\s+(\d{1,3})\+?\s+days/i);
    if (days) return { amount: money(amt[0]), days: Number(days[1]) };
    const months = sentence.match(/(?:for|at least)\s+(\d{1,2}|one|two|three|six)\s+months?/i);
    if (months) {
      const n = { one: 1, two: 2, three: 3, six: 6 }[months[1].toLowerCase()] ?? Number(months[1]);
      return { amount: money(amt[0]), days: n * 30 };
    }
    // 기간 없이 예치 요구만: "Requires a $35,000 deposit", "requires a deposit of $35,000", "balance of $10,000+".
    if (/\brequir\w*\b[^.]*\$\d[\d,]*\+?\s+(?:deposit|in new money|new money)|\bdeposit of \$\d|\bbalance of \$\d/i.test(sentence)) {
      return { amount: money(amt[0]), days: null };
    }
  }
  return { amount: null, days: null };
}

/** 지점 개설만 — 제목 "In Branch" 또는 메모 "in branch only"/"must open in branch". 온라인 개설 명시는 0. */
export function detectInBranch(title: string, notes: string): 0 | 1 | null {
  if (/\bin[\s-]branch\b/i.test(title)) return 1;
  if (/\bin[\s-]branch only\b|must (?:be )?open(?:ed)? in[\s-]branch|branch[\s-]only/i.test(notes)) return 1;
  if (/\b(?:can be )?open(?:ed)? online\b/i.test(notes)) return 0;
  return null;
}

export function hardPullFrom(pullText: string | null): 0 | 1 | null {
  if (!pullText) return null;
  if (/\bhard\b/i.test(pullText)) return 1;
  if (/\bsoft\b/i.test(pullText)) return 0;
  return null;
}

export function isTargeted(title: string): 0 | 1 {
  return /\[targeted\]|\btargeted\b/i.test(title) ? 1 : 0;
}

/** 묶음 글·목록 글·증권/코인은 계좌 오퍼가 아니다. */
export function offerKind(title: string, accountType: AccountType): { isOffer: 0 | 1; accountType: AccountType } {
  if (/\b(brokerage|robinhood|webull|e\*trade|fidelity)\b/i.test(title)) return { isOffer: 0, accountType: "brokerage" };
  if (/\b(crypto|bitcoin|binance|coinbase)\b/i.test(title)) return { isOffer: 0, accountType: "other" };
  if (accountType === "brokerage" || accountType === "other") return { isOffer: 0, accountType };
  if (/^best\s/i.test(title) || /roundup|reference|list of/i.test(title)) return { isOffer: 0, accountType };
  return { isOffer: 1, accountType };
}

/** CA 거주자 가능 — 전국 1 / 주 목록에 CA 1 / 주 목록에 CA 없음 0 / 모름 null. */
export function caEligibleFrom(nationwide: number | null, stateText: string | null): 0 | 1 | null {
  if (stateText) return stateText.split(/,\s*/).includes("CA") ? 1 : 0;
  if (nationwide === 1) return 1;
  return null;
}

/**
 * 가입 자격 제한 — 군인·특정 고용주·카운티·학교 등 회원 자격이 걸린 문장.
 * "Wells Fargo employees are not eligible" 같은 직원 제외 문구는 자격 제한이 아니다 (반대 뜻).
 */
const MEMBERSHIP = /\b(?:field of membership|membership (?:is )?(?:open|available) to|eligible (?:to join|for membership)|must (?:first )?(?:be|become) a member|live,? work,? (?:worship|or attend)|live or work|work or worship|attend school|military|armed forces|active duty|veterans?|department of defense|select employer|employer (?:group|partner)s?|sponsor(?:ing)? (?:company|organization)|count(?:y|ies)|school district|alumni)\b/i;

export function membershipSentence(text: string | null): string | null {
  if (!text) return null;
  for (const s of text.split(/(?<=[.!?])\s+|\n+/)) {
    if (!MEMBERSHIP.test(s)) continue;
    // 제한하는 문장이어야 한다 — "recurring ACH from employer, military pay"(직접입금 정의), 수수료 면제 대상 목록,
    // "best credit union in Orange County"(소개 문구) 같은 문장은 제외.
    if (!/\b(?:must|only|open to|resides?|resident of|lives?|works?|limited to|restricted to|field of membership|eligible for membership|eligible to join|membership is)\b/i.test(s)) continue;
    if (/\breferr(?:al|er|ed|ing)?\b/i.test(s)) continue; // 추천 보너스 문구는 가입 자격 문장이 아니다.
    if (/\bemployees?\b[^.]{0,40}\b(?:not eligible|ineligible|excluded|are not)\b|\bnot available to\b[^.]{0,60}\bemployees?\b/i.test(s)) continue;
    return s.trim().slice(0, 500);
  }
  return null;
}

export function isMembershipRestricted(text: string | null): boolean {
  return !!text && MEMBERSHIP.test(text);
}
