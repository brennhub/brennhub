/**
 * /api/admin/bank-bonus/probe — 일회성 dev 전용 probe (D1 쓰기 없음).
 * Worker에서 Doctor of Credit 등을 fetch했을 때 신선한 페이지가 오는지 확인용.
 * 인증: middleware.ts가 /api/admin/*를 OAuth + is_admin으로 보호. prod에서는 404.
 * 추후 삭제하거나 실제 fetcher로 발전시킬 예정.
 */

import { isProdEnv } from "@/lib/env.server";
import { blockMarkersIn, fetchFresh } from "@/lib/bank-bonus/http";

export const dynamic = "force-dynamic";

type Extract = (body: string, contentType: string) => Record<string, unknown>;

function matchAll(body: string, re: RegExp, n: number, group = 0): string[] {
  const out: string[] = [];
  for (const m of body.matchAll(re)) {
    out.push(m[group].trim());
    if (out.length >= n) break;
  }
  return out;
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const TARGETS: { url: string; extract: Extract }[] = [
  {
    url: "https://www.doctorofcredit.com/best-bank-account-bonuses/",
    extract: (body) => {
      const text = stripTags(body);
      const idx = text.search(/Recent Changes/i);
      return {
        forMonth: text.match(/For [A-Z][a-z]+, 20\d\d/)?.[0] ?? null,
        recentChangesFound: idx >= 0,
        recentChangeDates:
          idx >= 0 ? matchAll(text.slice(idx), /\[\d{1,2}\/\d{1,2}\/\d{2}\]/g, 3) : [],
      };
    },
  },
  {
    url: "https://www.doctorofcredit.com/bank-account-quick-reference-table/",
    extract: (body) => {
      // 각 <tr>의 첫 <td> 텍스트를 은행명으로 간주.
      const rows = matchAll(body, /<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>/gi, 5, 1)
        .map((s) => stripTags(s).trim())
        .filter(Boolean);
      return { firstBanks: rows.length ? rows : "not parsed" };
    },
  },
  {
    url: "https://www.doctorofcredit.com/category/bank-account-bonuses/",
    extract: (body) => ({
      postDates: matchAll(
        stripTags(body),
        /(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d/g,
        3,
      ),
    }),
  },
  {
    url: "https://www.doctorofcredit.com/category/bank-account-bonuses/feed/",
    extract: (body) => {
      const isRss = /<rss[\s>]/i.test(body);
      return {
        isRss,
        pubDates: isRss ? matchAll(body, /<pubDate>([^<]+)<\/pubDate>/g, 3, 1) : [],
      };
    },
  },
  {
    url: "https://www.doctorofcredit.com/sitemap.xml",
    extract: (body) => ({ isSitemapIndex: /<sitemapindex[\s>]/i.test(body) }),
  },
  {
    url: "https://accountoffers.wellsfargo.com/checkingoffer/",
    extract: (body) => {
      const text = stripTags(body);
      return {
        firstBonus: text.match(/\$\d{3}(?!\d)/)?.[0] ?? null,
        endsText: text.match(/ends [A-Z][a-z]+\.? \d{1,2}, \d{4}/i)?.[0] ?? null,
      };
    },
  },
];

async function probe({ url, extract }: (typeof TARGETS)[number]) {
  const started = Date.now();
  try {
    const res = await fetchFresh(url);
    let extracted: Record<string, unknown>;
    try {
      extracted = extract(res.body, res.contentType);
    } catch (e) {
      extracted = { error: String(e) };
    }
    const markers = blockMarkersIn(res.body);
    return {
      url,
      status: res.status,
      finalUrl: res.finalUrl,
      contentType: res.contentType,
      bodyLength: res.body.length,
      elapsedMs: res.elapsedMs,
      blockMarkers: markers,
      looksBlocked: markers.length > 0,
      cfCacheStatus: res.cfCacheStatus,
      age: res.age,
      lastModified: res.lastModified,
      extracted,
    };
  } catch (e) {
    return { url, error: String(e), elapsedMs: Date.now() - started };
  }
}

export async function GET() {
  if (await isProdEnv()) {
    return Response.json({ error: "Not available in production" }, { status: 404 });
  }
  const results = await Promise.all(TARGETS.map(probe));
  return Response.json(
    { probedAt: new Date().toISOString(), results },
    { headers: { "Cache-Control": "no-store" } },
  );
}
