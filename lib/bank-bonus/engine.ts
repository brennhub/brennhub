/**
 * fetch 엔진 — 소스 1개를 받아와 파싱 → bb_offers upsert → bb_fetch_runs 기록.
 * 파서는 source.key로 고른다. AI 호출 없음 (코드 파싱만).
 */

import { DETAIL_FETCH } from "./config";
import { listDetails, listEnabledSources, listFlags, listStoredOffers, recordRun, upsertDetail, upsertOffers } from "./db";
import { extractDetail } from "./detail";
import { byBonus, evaluateAll } from "./offers";
import { blockMarkersIn, fetchFresh, type FetchResult } from "./http";
import { parseMaster } from "./parse-master";
import { parseRss } from "./parse-rss";
import { parseQuickrefCsv } from "./parse-csv";
import type { ParseResult, SourceRow } from "./types";

const PARSERS: Record<string, (body: string) => ParseResult> = {
  doc_master: parseMaster,
  doc_rss: (body) => parseRss(body),
  // 보관 중 (bb_sources.enabled=0) — 시트가 2021-12 이후 갱신 없음. 켜면 바로 동작.
  doc_quickref: (body) => parseQuickrefCsv(body),
};

export type FetchSummary = {
  source: string;
  status: number | null;
  ok: boolean;
  items_found: number | null;
  items_new: number | null;
  items_updated: number | null;
  source_as_of: string | null;
  error: string | null;
};

export async function fetchSource(
  db: D1Database,
  source: SourceRow,
  trigger: "manual" | "cron",
): Promise<FetchSummary> {
  const startedAt = new Date().toISOString();
  let res: FetchResult | null = null;
  let parsed: ParseResult | null = null;
  let counts: { itemsNew: number; itemsUpdated: number } | null = null;
  let error: string | null = null;

  try {
    const parser = PARSERS[source.key];
    if (!parser) throw new Error(`no parser for source "${source.key}"`);
    res = await fetchFresh(source.url);
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    parsed = parser(res.body);
    if (parsed.items.length === 0) {
      const markers = blockMarkersIn(res.body);
      throw new Error(`no items parsed${markers.length ? ` (block markers: ${markers.join(", ")})` : ""}`);
    }
    counts = await upsertOffers(db, source.id, parsed.items, startedAt, parsed.marksGone);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const age = res?.age != null ? parseInt(res.age, 10) : NaN;
  const summary: FetchSummary = {
    source: source.key,
    status: res?.status ?? null,
    ok: !error,
    items_found: parsed?.items.length ?? null,
    items_new: counts?.itemsNew ?? null,
    items_updated: counts?.itemsUpdated ?? null,
    source_as_of: parsed?.sourceAsOf ?? null,
    error,
  };

  try {
    await recordRun(db, {
      sourceId: source.id,
      trigger,
      startedAt,
      finishedAt: new Date().toISOString(),
      httpStatus: summary.status,
      finalUrl: res?.finalUrl ?? null,
      bodyLength: res?.body.length ?? null,
      lastModified: res?.lastModified ?? null,
      ageSeconds: Number.isFinite(age) ? age : null,
      sourceAsOf: summary.source_as_of,
      ok: summary.ok,
      error,
      itemsFound: summary.items_found,
      itemsNew: summary.items_new,
      itemsUpdated: summary.items_updated,
    });
  } catch (e) {
    summary.error = `${error ? `${error}; ` : ""}run log failed: ${e instanceof Error ? e.message : String(e)}`;
  }
  return summary;
}

export type DetailSummary = {
  candidates: number;
  fetched: number;
  skippedRecent: number;
  failed: number;
  errors: string[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 상세 글 수집 — 지금 할 만한 오퍼 + 관심(⭐) 오퍼 중 detail_url 있는 것.
 * 7일 안에 받은 것은 건너뛰고, 보너스 큰 순으로 최대 40건, 300ms 간격.
 */
export async function fetchDetails(db: D1Database): Promise<DetailSummary> {
  const [rows, flags, details] = await Promise.all([listStoredOffers(db), listFlags(db), listDetails(db)]);
  const { all } = evaluateAll(rows, flags, details);
  const now = Date.now();
  const wanted = all.filter((o) => o.detailUrl && (o.doable || o.flags.star)).sort(byBonus);
  const fresh = (key: string) => {
    const at = details.get(key)?.fetched_at;
    return !!at && now - Date.parse(at) < DETAIL_FETCH.refetchAfterDays * 86_400_000;
  };
  const todo = wanted.filter((o) => !fresh(o.key)).slice(0, DETAIL_FETCH.maxPerRefresh);

  const summary: DetailSummary = {
    candidates: wanted.length,
    fetched: 0,
    skippedRecent: wanted.length - wanted.filter((o) => !fresh(o.key)).length,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < todo.length; i++) {
    const o = todo[i];
    if (i > 0) await sleep(DETAIL_FETCH.gapMs);
    let status: number | null = null;
    try {
      const res = await fetchFresh(o.detailUrl!);
      status = res.status;
      const ok = res.status >= 200 && res.status < 300;
      await upsertDetail(db, o.key, o.detailUrl!, status, ok ? extractDetail(res.body) : null, new Date().toISOString());
      if (ok) summary.fetched++;
      else {
        summary.failed++;
        summary.errors.push(`${o.bank ?? o.key}: HTTP ${status}`);
      }
    } catch (e) {
      summary.failed++;
      summary.errors.push(`${o.bank ?? o.key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return summary;
}

/** refresh 1회 — 활성 소스 전부 → 상세 글. */
export async function refreshAll(
  db: D1Database,
  trigger: "manual" | "cron",
): Promise<{ sources: FetchSummary[]; details: DetailSummary | { error: string } }> {
  const sources: FetchSummary[] = [];
  for (const s of await listEnabledSources(db)) sources.push(await fetchSource(db, s, trigger));
  let details: DetailSummary | { error: string };
  try {
    details = await fetchDetails(db);
  } catch (e) {
    details = { error: e instanceof Error ? e.message : String(e) };
  }
  return { sources, details };
}
