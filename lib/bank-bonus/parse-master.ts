/**
 * DoC "Best Bank Account Bonuses" 마스터 페이지 파서.
 *
 * 구조 (2026-10 확인): TOC 플러그인 "Contents" 목록(#toc_container) 아래에
 * <h2> 섹션 → <h3> 항목. 항목 뒤 <p>(direct link·메모) + <ul><li> 불릿
 * ("Read our full post" / pull / credit card funding / direct deposit).
 * 섹션 목록이 끝나면 <h2>Recent Changes</h2> — [MM/DD/YY] 날짜 불릿.
 */

import type { AccountType, OfferInput, ParseResult } from "./types";
import {
  accountTypeFromText,
  excerpt,
  htmlToText,
  parseBonus,
  parseStatesFromHeading,
} from "./text";

type Section = { type: AccountType | null; stateOnly: boolean };

const SECTIONS: [RegExp, Section][] = [
  [/^Best Checking/i, { type: "checking", stateOnly: false }],
  [/^Best Sav/i, { type: "savings", stateOnly: false }],
  [/^Best Business/i, { type: "business", stateOnly: false }],
  [/^Best State Specific/i, { type: null, stateOnly: true }],
  [/^Highly Region Specific/i, { type: null, stateOnly: true }],
];

function sectionFor(heading: string): Section | null {
  return SECTIONS.find(([re]) => re.test(heading))?.[1] ?? null;
}

function normalizeKey(heading: string): string {
  return heading.toLowerCase().replace(/\s+/g, " ").trim();
}

/** "For October, 2026 / last change 10/13/26" — 둘 중 있는 것만. */
function parseAsOf(html: string): string | null {
  const forMonth = htmlToText(html.slice(0, 200_000)).match(/For [A-Z][a-z]+, 20\d\d/)?.[0] ?? null;

  let latest: string | null = null;
  let latestN = -1;
  const rc = html.indexOf('id="Recent_Changes"');
  if (rc >= 0) {
    for (const m of html.slice(rc, rc + 30_000).matchAll(/\[(\d{1,2})\/(\d{1,2})\/(\d{2})\]/g)) {
      const n = Number(m[3]) * 10_000 + Number(m[1]) * 100 + Number(m[2]);
      if (n > latestN) {
        latestN = n;
        latest = `${m[1]}/${m[2]}/${m[3]}`;
      }
    }
  }
  const parts = [forMonth, latest ? `last change ${latest}` : null].filter(Boolean);
  return parts.length ? parts.join(" / ") : null;
}

export function parseMaster(html: string): ParseResult {
  const toc = html.indexOf('id="toc_container"');
  if (toc < 0) throw new Error('"Contents" list (#toc_container) not found');
  const tocEnd = html.indexOf("</div>", toc);
  const body = html.slice(tocEnd > 0 ? tocEnd : toc);

  const headings = [...body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => ({
    level: Number(m[1]),
    text: htmlToText(m[2]),
    start: m.index,
    end: m.index + m[0].length,
  }));

  const items: OfferInput[] = [];
  const seen = new Map<string, number>();
  let section: Section | null = null;
  let sawSection = false;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (h.level === 2) {
      section = sectionFor(h.text);
      if (section) sawSection = true;
      else if (sawSection) break; // Recent Changes 등 — 섹션 목록 끝.
      continue;
    }
    if (h.level !== 3 || !section) continue;

    const block = body.slice(h.end, headings[i + 1]?.start ?? body.length);
    const bullets = [...block.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => ({
      html: m[1],
      text: htmlToText(m[1]),
    }));
    // DoC 요건 불릿은 knowledge-base 링크를 단다 — 링크 우선, 없으면 키워드.
    const find = (href: RegExp, re: RegExp) =>
      (bullets.find((b) => href.test(b.html)) ?? bullets.find((b) => re.test(b.text)))?.text ?? null;
    const fullPost = block.match(/<a[^>]+href="([^"]+)"[^>]*>\s*Read our full post/i)?.[1] ?? null;

    const title = h.text;
    const bonus = parseBonus(title);
    const bankPart = title.split(/\s*[–—]\s*|\s+-\s+/)[0];
    const bank = bankPart.split(/\s+(?:up\s+to\s+)?\$/i)[0].trim() || null;
    const stateText = parseStatesFromHeading(title);

    let key = normalizeKey(title);
    const dup = seen.get(key) ?? 0;
    seen.set(key, dup + 1);
    if (dup) key = `${key} #${dup + 1}`;

    items.push({
      externalKey: key,
      bank,
      title,
      accountType: section.type ?? accountTypeFromText(title),
      bonusMin: bonus.min,
      bonusMax: bonus.max,
      bonusText: bonus.text,
      stateText,
      nationwide: stateText || section.stateOnly ? 0 : 1,
      ddText: find(/href="[^"]*count-direct-deposits/i, /direct deposit/i),
      pullText: find(/href="[^"]*soft-or-hard-pull/i, /\bpull\b/i),
      ccFundingText: find(/href="[^"]*funding-a-bank-account-with-a-credit-card/i, /credit card/i),
      detailUrl: fullPost,
      pinned: 0,
      rawExcerpt: excerpt(htmlToText(block)),
    });
  }

  return { items, sourceAsOf: parseAsOf(html), marksGone: true };
}
