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

import {
  caEligibleFrom,
  detectInBranch,
  hardPullFrom,
  isTargeted,
  offerKind,
  parseDd,
  parseDepositHold,
  parseExpires,
} from "./derive";

type Section = { key: string; type: AccountType | null; stateOnly: boolean };

const SECTIONS: [RegExp, Section][] = [
  [/^Best Checking/i, { key: "checking", type: "checking", stateOnly: false }],
  [/^Best Sav/i, { key: "savings", type: "savings", stateOnly: false }],
  [/^Best Business/i, { key: "business", type: "business", stateOnly: false }],
  [/^Best State Specific/i, { key: "state", type: null, stateOnly: true }],
  [/^Highly Region Specific/i, { key: "region", type: null, stateOnly: true }],
];

/**
 * 주·지역 섹션은 섹션이 유형을 말해 주지 않는다 — 제목, 글 URL slug("...-checking-bonus/"),
 * 그다음 메모에서 한쪽만 언급될 때만.
 */
function inferType(title: string, notes: string, url: string | null): AccountType {
  const fromTitle = accountTypeFromText(title);
  if (fromTitle !== "unknown") return fromTitle;
  const slug = url ? accountTypeFromText(url.replace(/[-/]/g, " ")) : "unknown";
  if (slug !== "unknown") return slug;
  const checking = /checking/i.test(notes);
  const savings = /savings|money market/i.test(notes);
  if (checking !== savings) return checking ? "checking" : "savings";
  return "unknown";
}

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
  let rank = 0;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (h.level === 2) {
      section = sectionFor(h.text);
      rank = 0;
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

    // 항목 아래 <p> 메모 ("Direct link to offer" 링크 줄 제외).
    const notes = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => htmlToText(m[1]))
      .filter((t) => t && !/^direct link to offer$/i.test(t))
      .join("\n");
    const blockText = htmlToText(block);

    const title = h.text;
    const bonus = parseBonus(title);
    const bankPart = title.split(/\s*[–—]\s*|\s+-\s+/)[0];
    const bank = bankPart.split(/\s+(?:up\s+to\s+)?\$/i)[0].trim() || null;
    const stateText = parseStatesFromHeading(title);

    let key = normalizeKey(title);
    const dup = seen.get(key) ?? 0;
    seen.set(key, dup + 1);
    if (dup) key = `${key} #${dup + 1}`;

    const ddText = find(/href="[^"]*count-direct-deposits/i, /direct deposit/i);
    const pullText = find(/href="[^"]*soft-or-hard-pull/i, /\bpull\b/i);
    const nationwide = stateText || section.stateOnly ? 0 : 1;
    const dd = parseDd(ddText ?? (/direct deposit not required/i.test(title) ? title : null));
    const hold = parseDepositHold(`${notes}\n${bullets.map((b) => b.text).join("\n")}`);
    const kind = offerKind(title, section.type ?? inferType(title, notes, fullPost));
    rank++;

    items.push({
      externalKey: key,
      bank,
      title,
      accountType: kind.accountType,
      bonusMin: bonus.min,
      bonusMax: bonus.max,
      bonusText: bonus.text,
      bonusNote: bonus.note,
      stateText,
      nationwide,
      ddText,
      pullText,
      ccFundingText: find(/href="[^"]*funding-a-bank-account-with-a-credit-card/i, /credit card/i),
      detailUrl: fullPost,
      pinned: 0,
      rawExcerpt: excerpt(blockText),
      ddRequired: dd.required,
      ddAmount: dd.amount,
      expiresOn: parseExpires(blockText),
      caEligible: caEligibleFrom(nationwide, stateText),
      depositHoldAmount: hold.amount,
      depositHoldDays: hold.days,
      inBranch: detectInBranch(title, notes),
      hardPull: hardPullFrom(pullText),
      targeted: isTargeted(title),
      isOffer: kind.isOffer,
      section: section.key,
      sectionRank: rank,
      notes: notes || null,
    });
  }

  return { items, sourceAsOf: parseAsOf(html), marksGone: true };
}
