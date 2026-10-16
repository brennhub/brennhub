/**
 * bank-bonus 텍스트 유틸 — HTML 조각 → 평문, 보너스 금액, 주(state) 판정.
 * 확신이 없으면 null을 돌려준다 (추측 금지).
 */

import type { AccountType } from "./types";

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** 태그 제거 → 엔티티 해제 → 공백 정리. */
export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

/**
 * 첫 보너스 표현 — "$300", "$300-$400", "$300 – $400", "$200/$500/$1,000", "Up To $500".
 * "Up To"는 하한을 모르므로 min = null.
 */
export function parseBonus(text: string): { min: number | null; max: number | null; text: string | null } {
  const m = text.match(/(up\s+to\s+)?\$\d[\d,]*(?:\s*[-–—/]\s*\$\d[\d,]*)*/i);
  if (!m) return { min: null, max: null, text: null };
  const nums = (m[0].match(/\d[\d,]*/g) ?? []).map((n) => parseInt(n.replace(/,/g, ""), 10));
  const max = Math.max(...nums);
  return { min: m[1] ? null : Math.min(...nums), max, text: m[0].trim() };
}

const STATE_CODES = new Set(
  ("AK AL AR AZ CA CO CT DC DE FL GA HI IA ID IL IN KS KY LA MA MD ME MI MN MO MS MT " +
    "NC ND NE NH NJ NM NV NY OH OK OR PA RI SC SD TN TX UT VA VT WA WI WV WY").split(" "),
);

function codesIn(s: string): string[] {
  return (s.replace(/D\.C\./g, "DC").match(/\b[A-Z]{2}\b/g) ?? []).filter((c) => STATE_CODES.has(c));
}

function uniqueJoin(codes: string[]): string | null {
  const u = [...new Set(codes)];
  return u.length ? u.join(", ") : null;
}

/**
 * 헤딩의 주 제한 — 대시(– 또는 공백 낀 -)로 나뉜 뒤쪽 조각의 주 코드, 또는 "CA only".
 * 첫 조각(은행명 + 금액)은 보지 않는다 ("Unitus ... OR & WA – $300"은 판정 불가로 남김).
 */
export function parseStatesFromHeading(heading: string): string | null {
  const segments = heading.split(/\s*[–—]\s*|\s+-\s*|\s*-\s+/);
  const codes = segments.slice(1).flatMap(codesIn);
  for (const m of heading.matchAll(/\b([A-Z]{2})\s+[Oo]nly\b/g)) {
    if (STATE_CODES.has(m[1])) codes.push(m[1]);
  }
  return uniqueJoin(codes);
}

/** RSS 제목 앞 대괄호 "[FL, GA]" / "[UT Only]" / "[NY, In Branch]"의 주 코드. 없으면("[Targeted]" 등) null. */
export function parseStatesFromBracket(bracket: string): string | null {
  return uniqueJoin(codesIn(bracket));
}

export function accountTypeFromText(text: string): AccountType {
  if (/business/i.test(text)) return "business";
  if (/saving/i.test(text)) return "savings";
  if (/checking/i.test(text)) return "checking";
  return "unknown";
}

export function excerpt(text: string, max = 500): string | null {
  const t = text.trim();
  return t ? t.slice(0, max) : null;
}
