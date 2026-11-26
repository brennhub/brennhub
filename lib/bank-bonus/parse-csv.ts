/**
 * DoC Quick Reference 시트 (공개 Google Sheets CSV export) 파서 — doc_quickref.
 *
 * ⚠️ 보관(parked): 시트가 2021-12 이후 갱신되지 않아 소스는 enabled=0. 파서만 준비해 둔다.
 * CSV export는 하이퍼링크를 잃는다 — "DoC Post" 열은 URL이 아니라 "Link" 글자뿐이라
 * detail_url은 URL 모양일 때만 채우고, external_key는 은행 + 유형으로 만든다.
 * 열 이름이 겹친다 (Type이 두 번) — 위치로 집는다.
 */

import type { AccountType, OfferInput, ParseResult } from "./types";

/** RFC 4180 — 따옴표 안 쉼표·줄바꿈·"" 이스케이프. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const money = (s: string) => {
  const m = s.match(/\$?\s*(\d[\d,]*)/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
};

/** 두 번째 Type 열 코드: PC 개인 입출금, PS 개인 저축, BC/BS 사업자, BR 증권. T 접미는 그대로 같은 유형. */
function accountType(code: string, institution: string): AccountType {
  const c = code.trim().toUpperCase();
  if (c.startsWith("PC")) return "checking";
  if (c.startsWith("PS")) return "savings";
  if (c.startsWith("BC") || c.startsWith("BS")) return "business";
  if (c === "BR" || /brokerage/i.test(institution)) return "brokerage";
  if (/prepaid/i.test(institution)) return "other";
  return "unknown";
}

const MAPPED = new Set(["Bank", "CC Funding", "CC $", "Credit Inquiry", "DD Req", "DD $", "Expiration", "BB $", "DoC Post", "USA", "CA"]);

export function parseQuickrefCsv(text: string, today = new Date().toISOString().slice(0, 10)): ParseResult {
  const rows = parseCsv(text);
  const header = rows[0] ?? [];
  if (header[0] !== "Bank") throw new Error(`unexpected CSV header: ${header.slice(0, 3).join(",")}`);

  const col = (name: string, nth = 0) => header.reduce<number[]>((a, h, i) => (h === name ? [...a, i] : a), [])[nth] ?? -1;
  const I = {
    bank: col("Bank"),
    institution: col("Type", 0),
    typeCode: col("Type", 1),
    ccFunding: col("CC Funding"),
    ccAmount: col("CC $"),
    inquiry: col("Credit Inquiry"),
    ddReq: col("DD Req"),
    ddAmount: col("DD $"),
    expiration: col("Expiration"),
    bonus: col("BB $"),
    post: col("DoC Post"),
    usa: col("USA"),
    ca: col("CA"),
  };
  const typeCols = new Set([I.institution, I.typeCode]);

  const items: OfferInput[] = [];
  const seen = new Map<string, number>();
  for (const r of rows.slice(1)) {
    const v = (i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
    const bank = v(I.bank);
    if (!bank) continue;

    const type = accountType(v(I.typeCode), v(I.institution));
    let key = `${bank.toLowerCase().replace(/\s+/g, " ")}|${type}`;
    const dup = seen.get(key) ?? 0;
    seen.set(key, dup + 1);
    if (dup) key = `${key} #${dup + 1}`;

    const bonus = v(I.bonus) ? money(v(I.bonus)) : null;
    const expires = /^\d{4}-\d{2}-\d{2}$/.test(v(I.expiration)) ? v(I.expiration) : null;
    const usa = v(I.usa);
    const ca = v(I.ca);
    const ddReq = v(I.ddReq);
    const inquiry = v(I.inquiry);
    const post = v(I.post);

    const extra: Record<string, string> = {};
    header.forEach((h, i) => {
      if (!MAPPED.has(h) && !typeCols.has(i) && v(i)) extra[h] = v(i);
    });

    items.push({
      externalKey: key,
      bank,
      title: bank,
      accountType: type,
      bonusMin: bonus,
      bonusMax: bonus,
      bonusText: v(I.bonus) || null,
      stateText: null,
      nationwide: usa === "Y" ? 1 : usa === "N" ? 0 : null,
      ddText: ddReq ? `DD Req: ${ddReq}${v(I.ddAmount) ? ` (${v(I.ddAmount)})` : ""}` : null,
      pullText: inquiry && inquiry !== "Unknown" ? inquiry : null,
      ccFundingText: v(I.ccFunding) ? `${v(I.ccFunding)}${v(I.ccAmount) ? ` (${v(I.ccAmount)})` : ""}` : null,
      detailUrl: /^https?:\/\//.test(post) ? post : null,
      pinned: 0,
      rawExcerpt: JSON.stringify(extra).slice(0, 4000),
      ddRequired: ddReq === "Y" ? 1 : ddReq === "N" ? 0 : null, // O·A(대안 허용 등)는 판정 불가.
      ddAmount: v(I.ddAmount) ? money(v(I.ddAmount)) : null,
      expiresOn: expires,
      caEligible: ca.startsWith("Y") ? 1 : usa === "Y" ? 1 : usa === "N" ? 0 : null,
      hardPull: inquiry === "Hard" ? 1 : inquiry === "Soft" ? 0 : null,
      isOffer: type === "brokerage" || type === "other" ? 0 : 1,
      status: expires && expires < today ? "expired" : "active",
    });
  }
  return { items, sourceAsOf: null, marksGone: false };
}
