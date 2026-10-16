/**
 * 은행명 매칭 — 내 거래 은행(config.existingBanks)과 재신청 규칙(bb_bank_rules) 공용.
 * 정규화(소문자·& → and·구두점 제거) 후, 같거나 오퍼 은행명이 규칙 이름 + 공백으로 시작할 때만.
 * ("Arrowhead" ↔ "Arrowhead Credit Union" O, "Bank & Trust" ↔ "First Bank & Trust" X)
 */

const ALIASES: Record<string, string> = { citibank: "citi", "keybank": "key bank" };

export function normalizeBank(name: string): string {
  const n = name
    .toLowerCase()
    .replace(/&amp;|&/g, " and ")
    .replace(/[.,'’()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "");
  return ALIASES[n] ?? n;
}

export function bankMatches(offerBank: string | null, ruleBank: string): boolean {
  if (!offerBank) return false;
  const o = normalizeBank(offerBank);
  const r = normalizeBank(ruleBank);
  return !!r && (o === r || o.startsWith(`${r} `));
}
