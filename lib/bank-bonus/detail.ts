/**
 * DoC 상세 글 → 조건 추출 (코드만, 정규식). 모르면 null — 추측 금지.
 *
 * 글 구조 (2026-10 확인): 첫 <article> 안에
 *   [Update M/D/YY: Extended to ...] 문단들 → "Offer at a glance" <ul>(<strong>라벨:</strong> 값) →
 *   <h2>The Offer</h2>("Direct link to offer" 링크) → <h2>The Fine Print</h2> → Avoiding Fees → Our Verdict.
 * 댓글은 <article> 밖이라 보지 않는다. <del>(취소선) 안의 옛 값은 버린다.
 */

import { isTieredAmount, membershipSentence, parseDepositHold } from "./derive";
import { decodeEntities, htmlToText } from "./text";
import type { ApplyMethod, RequirementStep } from "./types";

export type DetailExtract = {
  finePrintText: string | null;
  expiresOn: string | null;
  applyMethods: ApplyMethod[] | null;
  ddAmount: number | null;
  ddDays: number | null;
  ddText: string | null;
  churnMonths: number | null;
  churnText: string | null;
  earlyTerminationText: string | null;
  monthlyFeeText: string | null;
  bankOfferUrl: string | null;
  postExpired: 0 | 1;
  /** "Offer at a glance" 목록 평문 (AI 추출 입력·근거 대조용). */
  glanceText: string | null;
  /** 정규식이 값을 뽑은 문장 — 화면 "근거"용. */
  evidence: { expires_on?: string; dd?: string; churn_months?: string };
  stacked: StackedExtract;
  /** 보너스 조건 체크리스트 (정규식, DoC 원문). 확신 없으면 null. */
  requirements: RequirementStep[] | null;
  /** 회원 자격 제한 문장 (군인·고용주·카운티·학교 등). */
  eligibilityText: string | null;
  /** 글 게시일 · 최신 "Update M/D/YY" (YYYY-MM-DD). */
  docPostedAt: string | null;
  docUpdatedAt: string | null;
};

/** 겹친(스택)·등급 오퍼. base = 직접입금만으로 받는 금액, total = 예치까지 채운 총액. */
export type StackedExtract = {
  bonusBase: number | null;
  bonusTotalWithDeposit: number | null;
  bonusTotalNote: "savings" | "top_tier" | null;
  holdAmount: number | null;
  holdDays: number | null;
  /** extra = 겹친 부분만 예치 필요 (기본 보너스는 예치 없음) · base = 어떤 보너스든 예치 필요. */
  holdScope: "extra" | "base" | null;
};

const FINE_PRINT_MAX = 4000;
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const MONTH_RE = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE_RE = `(?:${MONTH_RE}\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}\\/\\d{1,2}\\/(?:\\d{4}|\\d{2}))`;

const pad = (n: number) => String(n).padStart(2, "0");

/** "October 6, 2026" · "Oct 6 2026" · "10/6/2026" · "01/27/27" → YYYY-MM-DD. */
export function parseDate(s: string): string | null {
  const t = s.trim().toLowerCase();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const mo = Number(m[1]);
    const d = Number(m[2]);
    return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = t.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) {
    const mo = MONTHS.findIndex((name) => name.startsWith(m![1].slice(0, 3))) + 1;
    const d = Number(m[2]);
    return mo >= 1 && d >= 1 && d <= 31 ? `${m[3]}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

const WORD_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, eighteen: 18, "twenty-four": 24, "twenty four": 24, thirty: 30, "thirty-six": 36,
};
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : (WORD_NUM[s.toLowerCase()] ?? null));
const money = (s: string) => parseInt(s.replace(/[$,]/g, ""), 10);

function sentences(text: string): string[] {
  return text
    .replace(/\bU\.S\./g, "U.S") // "U.S. Bank"에서 문장을 끊지 않게.
    .split(/(?<=[.!?])\s+(?=[A-Z(])|\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** 첫 <article> (없으면 전체), script/style/취소선 제거. */
function articleHtml(html: string): string {
  const a = html.search(/<article[\s>]/i);
  const body = a >= 0 ? html.slice(a, html.indexOf("</article>", a) > a ? html.indexOf("</article>", a) : undefined) : html;
  return body
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(del|s|strike)\b[^>]*>[\s\S]*?<\/\1>/gi, " ");
}

/** h2 제목으로 섹션 HTML. */
function sectionHtml(html: string, heading: RegExp): string | null {
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)];
  const i = h2s.findIndex((m) => heading.test(htmlToText(m[1])));
  if (i < 0) return null;
  const start = h2s[i].index + h2s[i][0].length;
  return html.slice(start, h2s[i + 1]?.index ?? html.length);
}

/** "Offer at a glance" 목록 → { 라벨 소문자: 값 }. */
function glance(html: string): Map<string, string> {
  const out = new Map<string, string>();
  const g = html.search(/Offer at a glance/i);
  if (g < 0) return out;
  const ul = html.slice(g).match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (!ul) return out;
  for (const li of ul[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const m = li[1].match(/<strong[^>]*>([\s\S]*?)<\/strong>([\s\S]*)/i);
    if (!m) continue;
    const label = htmlToText(m[1]).replace(/:\s*$/, "").trim().toLowerCase();
    const value = htmlToText(m[2]).replace(/^[:\s]+/, "").trim();
    if (label && value) out.set(label, value);
  }
  return out;
}

const getGlance = (g: Map<string, string>, re: RegExp) => [...g.entries()].find(([k]) => re.test(k))?.[1] ?? null;

function lastDate(text: string): string | null {
  const all = [...text.matchAll(new RegExp(DATE_RE, "gi"))].map((m) => parseDate(m[0])).filter(Boolean) as string[];
  return all.length ? all.sort().at(-1)! : null;
}

/**
 * 글이 마지막으로 손본 날 — 제목 아래 게시일과 "Update M/D/YY" 중 가장 늦은 날.
 * DoC는 "Offer at a glance" 만료일을 자주 방치한다 (2019·2023 날짜가 남은 채 글은 2026에 갱신).
 */
function postDates(art: string, articleText: string): { posted: string | null; updated: string | null } {
  const byline = art.match(/<\/h1>([\s\S]{0,600})/i);
  const d = byline ? htmlToText(byline[1]).match(new RegExp(DATE_RE, "i")) : null;
  const updates = [...articleText.matchAll(/\bUpdate\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g)]
    .map((m) => parseDate(m[1]))
    .filter((x): x is string => !!x)
    .sort();
  return { posted: d ? parseDate(d[0]) : null, updated: updates.at(-1) ?? null };
}

function lastTouched(art: string, articleText: string): string | null {
  const dates: string[] = [];
  const byline = art.match(/<\/h1>([\s\S]{0,600})/i);
  if (byline) {
    const d = htmlToText(byline[1]).match(new RegExp(DATE_RE, "i"));
    const p = d ? parseDate(d[0]) : null;
    if (p) dates.push(p);
  }
  for (const m of articleText.matchAll(/\bUpdate\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g)) {
    const p = parseDate(m[1]);
    if (p) dates.push(p);
  }
  return dates.length ? dates.sort().at(-1)! : null;
}

function findExpires(
  art: string,
  articleText: string,
  glanceExpiry: string | null,
  searchText: string,
): { date: string | null; quote: string | null } {
  const candidates: { date: string | null; quote: string }[] = [];
  const quoteOf = (text: string, needle: string) => sentences(text).find((x) => x.includes(needle)) ?? needle;
  // 1) "Update ...: Extended to/through/till <date>" (글 맨 위 문단이 최신).
  const ext = articleText.match(new RegExp(`extended\\s+(?:to|through|until|till)\\s+(${DATE_RE})`, "i"));
  if (ext) candidates.push({ date: parseDate(ext[1]), quote: quoteOf(articleText, ext[0]) });
  // 2) "Offer at a glance" 만료일 (취소선 제거 후 마지막 날짜).
  if (glanceExpiry) candidates.push({ date: lastDate(glanceExpiry), quote: `Expiration date: ${glanceExpiry}` });
  // 3) 본문 문구.
  const phrase = searchText.match(
    new RegExp(`(?:expires?\\s+on|valid\\s+through|valid\\s+until|through|until|by)\\s+(${DATE_RE})`, "i"),
  );
  if (phrase) candidates.push({ date: parseDate(phrase[1]), quote: quoteOf(searchText, phrase[0]) });

  // 글을 마지막으로 손본 날보다 이른 마감일은 방치된 옛 값 — 쓰지 않는다.
  const floor = lastTouched(art, articleText);
  const hit = candidates.find((c) => !!c.date && (!floor || c.date >= floor));
  return hit ? { date: hit.date, quote: hit.quote.slice(0, 500) } : { date: null, quote: null };
}

// 재신청 기간 — 과거를 보는 창만: "in the last 365 days", "within the past twelve (12) months",
// "closed within 270 days prior", "one bonus every two years". 자격 충족 기한("within the first 90 days")은 제외.
const N = String.raw`(\d+|[a-z]+(?:-[a-z]+)?)(?:\s*\(\d+\))?`;
const CHURN_WINDOWS = [
  new RegExp(String.raw`\b(?:past|last|previous|prior)\s+${N}\s+(?:calendar\s+)?(days?|months?|years?)\b`, "i"),
  new RegExp(String.raw`\bwithin\s+${N}\s+(?:calendar\s+)?(days?|months?|years?)\s+(?:prior|before)\b`, "i"),
  new RegExp(String.raw`\b(?:once\s+)?every\s+${N}\s+(months?|years?)\b`, "i"),
];
const ELIGIBILITY = /\b(?:bonus|owned|had|have not|has not|member|customer|closed|received|eligible|available|participate)\b/i;

export function churnWindow(raw: string): number | null | undefined {
  // "closed with a negative balance within the last 3 years"는 재신청 규칙이 아니라 계좌 이력 제한 — 창에서 뺀다.
  const s = raw.replace(/\b(?:closed|charged[- ]off)\s+with\s+a\s+negative\s+balance\s+(?:with)?in\s+the\s+(?:last|past)\s+\S+\s+(?:years?|months?|days?)/gi, " ");
  // "one (1) checking account promotional offer per year" / "once per calendar year".
  if (/\b(?:one|1|once)\b(?:\s*\(1\))?[^.]{0,100}?\bper\s+(?:calendar\s+)?year\b/i.test(s)) return 12;
  for (const re of CHURN_WINDOWS) {
    const m = s.match(re);
    if (!m) continue;
    const n = num(m[1].replace(/-/g, "-"));
    if (n == null) return null;
    if (/year/i.test(m[2])) return n * 12;
    if (/day/i.test(m[2])) return Math.round(n / 30.44);
    return n;
  }
  return undefined; // 창 없음
}

/**
 * 재신청 기간. personal=true(개인 계좌 오퍼·개인 기준 목록)면 "business"가 든 문장은 근거로 쓰지 않는다
 * — 사업자 계좌 규칙(예: Capital One Business 180일)이 개인 오퍼에 붙지 않게.
 */
export function findChurn(text: string, opts: { personal?: boolean } = {}): { months: number | null; text: string | null } {
  const all = sentences(text)
    .filter((s) => ELIGIBILITY.test(s) || /per (?:calendar )?year/i.test(s))
    .filter((s) => !opts.personal || !/\bbusiness\b/i.test(s));
  const withWindow = all.filter((s) => churnWindow(s) !== undefined);
  // 보너스 수령 이력 문장 최우선 ("one bonus every two years", "received a bonus ... within the past 12 months"),
  // 그다음 오퍼 자격 문장 ("not eligible for this offer if ...").
  const s =
    withWindow.find((x) => /\bbonus(?:es)?\b/i.test(x)) ??
    withWindow.find((x) => /offer|eligible|promotion/i.test(x)) ??
    withWindow[0] ??
    all.find((x) => /previously received|closed an account/i.test(x));
  if (!s) return { months: null, text: null };
  return { months: churnWindow(s) ?? null, text: s.slice(0, 500) };
}

type DdFound = { amount: number | null; days: number | null; text: string | null; tiered: boolean };

function findDd(text: string, glanceDd: string | null): DdFound {
  // "direct deposit(s) of $X ... within Y days" / "$X or more in qualifying direct|electronic deposits within Y days".
  for (const s of sentences(text)) {
    if (!/direct deposit|qualifying (?:electronic|direct) deposit/i.test(s)) continue;
    if (/^for example\b/i.test(s)) continue; // 등급 예시 문장은 조건이 아니다.
    // 범위·등급("$1,000-$1,999", "$2,000 to $4,999.99 to earn the $250 bonus, ...")은 한 숫자로 줄이지 않는다 — 티어로 남긴다.
    const tiered = isTieredAmount(s);
    const a =
      s.match(/direct deposits?\s+(?:totaling\s+|of\s+|totaling\s+at\s+least\s+|of\s+at\s+least\s+)\$([\d,]+)/i) ??
      s.match(/\$([\d,]+)(?:\s*[-–]\s*\$[\d,]+)?\+?\s+(?:or more\s+)?(?:in\s+)?(?:total\s+)?(?:qualifying\s+)?(?:electronic\s+|direct\s+)deposits?/i);
    // 기한은 입금 표현 바로 뒤의 "within N days"만 — 보너스 지급 시기("credit ... within 14 days")는 제외.
    const dm = s.match(/deposits?\b[^.]{0,80}?within\s+(\d{1,3})\s+(?:calendar\s+|business\s+)?days/i);
    const d = dm && !/\b(?:credit|credited|paid|pay|bonus will)\b/i.test(dm[0]) ? dm : null;
    if (a || d || tiered) {
      return {
        amount: tiered ? null : a ? money(a[1]) : glanceAmount(glanceDd),
        days: d ? Number(d[1]) : null,
        text: s.slice(0, 500),
        tiered: tiered || (!a && glanceTiered(glanceDd)),
      };
    }
  }
  return { amount: glanceAmount(glanceDd), days: null, text: glanceDd, tiered: glanceTiered(glanceDd) };
}

const glanceTiered = (v: string | null) => !!v && /^yes/i.test(v) && isTieredAmount(v);

function glanceAmount(v: string | null): number | null {
  if (!v || !/^yes/i.test(v) || isTieredAmount(v)) return null;
  const m = v.match(/\$([\d,]+)/);
  return m ? money(m[1]) : null;
}

/** The Offer 불릿 — <li> 시작마다 자른다 (중첩 목록에서 바깥 불릿이 안쪽 불릿과 섞이지 않게). */
function offerBullets(offerHtml: string | null): string[] {
  return offerHtml
    ? offerHtml
        .split(/<li[^>]*>/i)
        .slice(1)
        .map((chunk) => htmlToText(chunk.split(/<\/li>|<ul[\s>]/i)[0]))
        .filter(Boolean)
    : [];
}

const amountIn = (b: string) => b.match(/bonus of \$([\d,]+)|\$([\d,]+)\s+(?:checking\s+)?bonus|receive \$([\d,]+)/i);

/** 겹친 오퍼 판정용 불릿: 입출금(예치 문구 없음) + 저축(예치/유지). */
function stackBullets(offerHtml: string | null) {
  const bullets = offerBullets(offerHtml);
  return {
    bullets,
    amountIn,
    checking: bullets.find((b) => /checking/i.test(b) && !/savings/i.test(b) && !/new money|balance|maintain/i.test(b) && amountIn(b)),
    savings: bullets.find((b) => /savings/i.test(b) && /new money|balance|maintain|deposit \$/i.test(b)),
  };
}

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30 };

/**
 * 보너스 조건 체크리스트 (DoC 원문 정규식). 단계마다 출처 문장을 인용으로 남긴다.
 *  - 겹친 오퍼: base = 입출금 불릿(직접입금 기한), extra = 저축 계좌 개설 + 예치 유지.
 *  - 그 밖: 직접입금(금액·기한, 등급이면 tiered) · 기본 예치 · 직불카드 거래 횟수.
 * 단계를 하나도 못 세우면 null (화면은 한 줄 요약 + "확인 필요").
 */
function buildRequirements(offerHtml: string | null, stacked: StackedExtract, dd: DdFound, searchText: string): RequirementStep[] | null {
  const steps: Omit<RequirementStep, "order">[] = [];
  const clip = (t: string) => t.trim().slice(0, 200);
  const daysIn = (t: string) => {
    const m = t.match(/within\s+(\d{1,3})\s+(?:calendar\s+|business\s+)?days/i);
    return m ? Number(m[1]) : null;
  };
  const base = { source: "doc_post" as const, via: "regex" as const };

  const { checking, savings } = stackBullets(offerHtml);
  if (stacked.holdScope === "extra" && stacked.bonusBase != null && checking && savings) {
    const ddCheck = /direct deposit/i.test(checking);
    steps.push({ ...base, portion: "base", kind: ddCheck ? "dd" : "other", text: clip(checking), amount: null, days: daysIn(checking), quote: clip(checking) });
    steps.push({ ...base, portion: "extra", kind: "open_account", text: clip(savings), amount: null, days: null, quote: clip(savings) });
    const hold = parseDepositHold(savings);
    if (hold.amount != null) {
      steps.push({ ...base, portion: "extra", kind: "deposit_hold", text: clip(savings), amount: hold.amount, days: hold.days, quote: clip(savings) });
    }
  } else {
    if (dd.text && (dd.amount != null || dd.days != null || dd.tiered)) {
      steps.push({ ...base, portion: "base", kind: "dd", text: clip(dd.text), amount: dd.tiered ? null : dd.amount, days: dd.days, tiered: dd.tiered, quote: clip(dd.text) });
    }
    if (stacked.holdScope === "base" && stacked.holdAmount != null) {
      const needle = stacked.holdAmount.toLocaleString("en-US");
      const q = sentences(searchText).find((x) => x.includes(needle) || x.includes(String(stacked.holdAmount)));
      if (q) steps.push({ ...base, portion: "base", kind: "deposit_hold", text: clip(q), amount: stacked.holdAmount, days: stacked.holdDays, quote: clip(q) });
    }
    const debit = sentences(searchText).find((x) => /\b(\d{1,2}|[a-z]+)\s+(?:or more\s+)?(?:qualifying\s+|eligible\s+)?debit card\s+(?:transactions|purchases)\b/i.test(x));
    if (debit) {
      const m = debit.match(/\b(\d{1,2}|[a-z]+)\s+(?:or more\s+)?(?:qualifying\s+|eligible\s+)?debit card\s+(?:transactions|purchases)\b/i)!;
      const count = /^\d+$/.test(m[1]) ? Number(m[1]) : (WORDS[m[1].toLowerCase()] ?? null);
      if (count != null) steps.push({ ...base, portion: "base", kind: "debit_txn", text: clip(debit), amount: null, days: daysIn(debit), count, quote: clip(debit) });
    }
  }
  return steps.length ? steps.map((x, i) => ({ ...x, order: i + 1 })) : null;
}

/**
 * 겹친·등급 오퍼.
 *  ① The Offer 불릿에 "입출금 보너스 $X(예치 없음)" + "저축 + 예치/유지" 불릿이 함께 → base X, total = 요약 최대액, 예치는 저축 쪽(extra).
 *  ② 요약 "Additional requirements: None for checking; $15,000 balance for savings" → 저축 겹침 (base는 불릿에서만).
 *  ③ 직접입금 불필요 + 요약 "Additional requirements: $20,000-$100,000 deposit" → 등급형: total = 최대액, 예치 = 최상위 금액(base).
 *  ④ "$900 | New Money Deposit Amount $15,000 or more" 같은 등급 줄 → 최상위 등급.
 */
function findStacked(g: Map<string, string>, offerText: string, offerHtml: string | null, termsText: string): StackedExtract {
  const none: StackedExtract = { bonusBase: null, bonusTotalWithDeposit: null, bonusTotalNote: null, holdAmount: null, holdDays: null, holdScope: null };
  const maxM = getGlance(g, /^maximum bonus/)?.match(/\$([\d,]+)/);
  const glanceMax = maxM ? money(maxM[1]) : null;
  const additional = getGlance(g, /^additional requirement/) ?? "";
  const ddReq = getGlance(g, /^direct deposit/) ?? "";

  const { checking, savings, amountIn } = stackBullets(offerHtml);

  // ①
  const checkingAmount = checking ? amountIn(checking)! : null;
  const base = checkingAmount ? money(checkingAmount[1] ?? checkingAmount[2] ?? checkingAmount[3]) : null;
  // 총액이 기본보다 커야 겹친 오퍼 (같으면 저축 불릿은 별개 안내일 뿐).
  if (base != null && savings && glanceMax != null && glanceMax > base) {
    const hold = parseDepositHold(savings);
    return {
      bonusBase: base,
      bonusTotalWithDeposit: glanceMax,
      bonusTotalNote: "savings",
      holdAmount: hold.amount,
      holdDays: hold.days,
      holdScope: "extra",
    };
  }
  // ②
  const forSavings = additional.match(/none for checking[^$]*\$([\d,]+)[^.]*savings/i);
  if (forSavings) {
    const hold = parseDepositHold(`${offerText}\n${termsText}`);
    return { ...none, bonusTotalWithDeposit: glanceMax, bonusTotalNote: "savings", holdAmount: money(forSavings[1]), holdDays: hold.days, holdScope: "extra" };
  }
  // ③
  const range = additional.match(/\$([\d,]+)(?:\s*[-–]\s*\$([\d,]+))?\+?\s+(?:deposit|balance|in new money|new money)/i);
  if (range && /^(?:no|none)\b/i.test(ddReq)) {
    const hold = parseDepositHold(`${offerText}\n${termsText}`);
    return {
      ...none,
      bonusTotalWithDeposit: glanceMax,
      bonusTotalNote: range[2] ? "top_tier" : null,
      holdAmount: money(range[2] ?? range[1]),
      holdDays: hold.days,
      holdScope: "base",
    };
  }
  // ④
  const tiers = [...offerText.matchAll(/\$([\d,]+)\s*\|\s*[^$|]{0,60}?(?:deposit|balance|new money)[^$|]{0,40}?\$([\d,]+)/gi)].map((m) => ({
    bonus: money(m[1]),
    deposit: money(m[2]),
  }));
  if (tiers.length) {
    const top = tiers.sort((a, b) => b.bonus - a.bonus)[0];
    return { ...none, bonusTotalWithDeposit: top.bonus, bonusTotalNote: tiers.length > 1 ? "top_tier" : null, holdAmount: top.deposit, holdScope: "base" };
  }
  return none;
}

function sentenceWith(text: string, re: RegExp): string | null {
  return sentences(text).find((s) => re.test(s))?.slice(0, 500) ?? null;
}

export function extractDetail(html: string, opts: { personal?: boolean } = {}): DetailExtract {
  const art = articleHtml(html);
  const articleText = htmlToText(art);
  const g = glance(art);
  const finePrintHtml = sectionHtml(art, /^the fine print$/i);
  const finePrint = finePrintHtml ? htmlToText(finePrintHtml) : null;
  const searchText = finePrint ?? articleText;

  const h1 = art.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const postExpired = (h1 && /^\s*\[expired\]/i.test(htmlToText(h1[1]))) || /deal has ended/i.test(articleText) ? 1 : 0;

  // 은행 오퍼 링크: "Direct link to offer" (취소선으로 지운 옛 링크는 이미 제거됨 — 대신 붙은 "New link"도 인정).
  const offerHtml = sectionHtml(art, /^the offer$/i);
  const offerLink =
    art.match(/<a[^>]+href="([^"]+)"[^>]*>\s*Direct link to (?:the )?offer\s*<\/a>/i) ??
    (offerHtml?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1].match(/<a[^>]+href="([^"]+)"[^>]*>\s*New link\s*<\/a>/i) ?? null);
  const bankOfferUrl = offerLink ? decodeEntities(offerLink[1]) : null;

  // 신청 방법 문구는 요약·오퍼·약관만 본다 — "Our Verdict"/FAQ는 반대 뜻으로도 쓴다
  // (예: "mailer/targeted가 필요한 줄 알았지만 아니다").
  const termsText = [[...g.entries()].map(([k, v]) => `${k}: ${v}.`).join(" "), offerHtml ? htmlToText(offerHtml) : "", finePrint ?? ""].join(" ");
  const methods: ApplyMethod[] = [];
  if (offerLink || /\b(?:can be )?open(?:ed)? online\b|\bapply online\b|\bonline or in[- ]branch\b/i.test(termsText)) methods.push("online");
  if (/\bin[- ]branch\b|\bvisit a branch\b|\bbranch visit\b/i.test(termsText)) methods.push("branch");
  if (/\b(?:offer|promo|promotional|bonus|coupon) code\b/i.test(termsText)) methods.push("code");
  if (/\btargeted\b|\bmailer\b/i.test(termsText)) methods.push("invite");

  const dd = findDd(searchText, getGlance(g, /^direct deposit/));
  const churn = findChurn(searchText, { personal: opts.personal });
  const expires = findExpires(art, articleText, getGlance(g, /^expiration/), searchText);
  const glanceText = g.size ? [...g.entries()].map(([k, v]) => `${k}: ${v}`).join("\n") : null;
  const stacked = findStacked(g, offerHtml ? htmlToText(offerHtml) : "", offerHtml, finePrint ?? "");
  const dates = postDates(art, articleText);
  const evidence: DetailExtract["evidence"] = {};
  if (expires.date && expires.quote) evidence.expires_on = expires.quote;
  if ((dd.amount != null || dd.days != null) && dd.text) evidence.dd = dd.text;
  if (churn.months != null && churn.text) evidence.churn_months = churn.text;

  return {
    finePrintText: (finePrint ?? articleText).slice(0, FINE_PRINT_MAX) || null,
    expiresOn: expires.date,
    applyMethods: methods.length ? methods : null,
    ddAmount: dd.amount,
    ddDays: dd.days,
    ddText: dd.text,
    churnMonths: churn.months,
    churnText: churn.text,
    earlyTerminationText:
      getGlance(g, /early (?:account )?termination/) ?? sentenceWith(articleText, /early (?:account )?termination|closed? within \d+ (?:days|months)/i),
    monthlyFeeText: getGlance(g, /^monthly fee/) ?? sentenceWith(articleText, /monthly (?:service |maintenance )?fee/i),
    bankOfferUrl,
    postExpired,
    glanceText,
    evidence,
    stacked,
    requirements: buildRequirements(offerHtml, stacked, dd, searchText),
    eligibilityText: membershipSentence(termsText),
    docPostedAt: dates.posted,
    docUpdatedAt: dates.updated,
  };
}
