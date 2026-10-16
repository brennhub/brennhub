/**
 * fetch 엔진 — 소스 1개를 받아와 파싱 → bb_offers upsert → bb_fetch_runs 기록.
 * 파서는 source.key로 고른다. AI 호출 없음 (코드 파싱만).
 */

import { recordRun, upsertOffers } from "./db";
import { blockMarkersIn, fetchFresh, type FetchResult } from "./http";
import { parseMaster } from "./parse-master";
import { parseRss } from "./parse-rss";
import type { ParseResult, SourceRow } from "./types";

const PARSERS: Record<string, (body: string) => ParseResult> = {
  doc_master: parseMaster,
  doc_rss: (body) => parseRss(body),
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
