/**
 * DoC 은행 계좌 카테고리 RSS 파서.
 * guid가 external_key — 단, DoC guid는 "?p=253636?d=20261019"처럼 날짜 꼬리가 붙어
 * 재고정(미래 날짜) 때 바뀔 수 있어 "?d=..." 꼬리를 떼고 쓴다.
 * DoC는 미래 pubDate로 글을 상단 고정한다 → pinned.
 * RSS 항목은 gone 처리하지 않는다 (피드 창 밖으로 밀려날 뿐).
 */

import type { OfferInput, ParseResult } from "./types";
import {
  accountTypeFromText,
  decodeEntities,
  excerpt,
  htmlToText,
  parseBonus,
  parseStatesFromBracket,
  stripCdata,
} from "./text";

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? stripCdata(m[1]).trim() : null;
}

/**
 * DoC 제목 관례: 앞 대괄호에 주 코드 → 그 주 한정(nationwide 0) / 대괄호 없음 → 전국(1) /
 * 주 코드 없는 대괄호("[Targeted]", "[Expired]", "[Update]") → 판정 불가(NULL).
 */
function parseTitle(title: string) {
  const bracket = title.match(/^\s*\[([^\]]+)\]\s*/);
  const rest = bracket ? title.slice(bracket[0].length) : title;
  const stateText = bracket ? parseStatesFromBracket(bracket[1]) : null;
  const nationwide: 0 | 1 | null = !bracket ? 1 : stateText ? 0 : null;

  // "Bank Name $400 Checking Bonus" 형태일 때만 은행명. "PayPal: Earn ..."·"Best ..."는 판정 불가.
  let bank: string | null = null;
  const m = rest.match(/^(.+?)\s+(?:up\s+to\s+)?\$\d/i);
  if (m && !m[1].includes(":") && !/^best\b/i.test(m[1])) {
    bank = m[1].replace(/\s*[–—-]\s*$/, "").trim() || null;
  }
  return { bank, stateText, nationwide, bonus: parseBonus(rest) };
}

export function parseRss(xml: string, now = Date.now()): ParseResult {
  if (!/<rss[\s>]/i.test(xml)) throw new Error("not an RSS document");

  const items: OfferInput[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const title = decodeEntities(tag(it, "title") ?? "").trim();
    const link = tag(it, "link");
    const guid = (tag(it, "guid") ?? link ?? "").replace(/\?d=\d+$/, "");
    if (!guid || !title) continue;

    const pub = Date.parse(tag(it, "pubDate") ?? "");
    const { bank, stateText, nationwide, bonus } = parseTitle(title);

    items.push({
      externalKey: guid,
      bank,
      title,
      accountType: accountTypeFromText(title),
      bonusMin: bonus.min,
      bonusMax: bonus.max,
      bonusText: bonus.text,
      stateText,
      nationwide,
      ddText: null,
      pullText: null,
      ccFundingText: null,
      detailUrl: link,
      pinned: Number.isFinite(pub) && pub > now ? 1 : 0,
      rawExcerpt: excerpt(htmlToText(tag(it, "description") ?? "")),
    });
  }

  const channel = xml.slice(0, xml.indexOf("<item>") > 0 ? xml.indexOf("<item>") : undefined);
  return { items, sourceAsOf: tag(channel, "lastBuildDate"), marksGone: false };
}
