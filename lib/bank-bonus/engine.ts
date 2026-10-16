/**
 * fetch 엔진 — 소스 1개를 받아와 파싱 → bb_offers upsert → bb_fetch_runs 기록.
 * 파서는 source.key로 고른다. AI 호출 없음 (코드 파싱만).
 */

import { AI_FIELDS, AI_INPUT_MAX, AI_MODEL, acceptWithEvidence, requestAiExtraction, type AiField } from "./ai";
import { AI_EXTRACT, DETAIL_FETCH } from "./config";
import {
  applyAiResult,
  listBankRules,
  listDetails,
  listEnabledSources,
  listFlags,
  listStoredOffers,
  recordRun,
  replaceBankRules,
  upsertDetail,
  upsertDocPostRule,
  upsertOffers,
} from "./db";
import { extractDetail } from "./detail";
import { byBonus, evaluateAll } from "./offers";
import { blockMarkersIn, fetchFresh, type FetchResult } from "./http";
import { parseMaster } from "./parse-master";
import { parseRss } from "./parse-rss";
import { parseQuickrefCsv } from "./parse-csv";
import { parseChurnList } from "./parse-churn";
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
  let rulesCount: number | null = null;
  let error: string | null = null;

  try {
    // 재신청 목록은 오퍼가 아니라 은행 규칙(bb_bank_rules)으로 들어간다.
    if (source.key === "doc_churn") {
      res = await fetchFresh(source.url);
      if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
      rulesCount = await replaceBankRules(db, "doc_churn", source.url, parseChurnList(res.body), startedAt);
    } else {
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
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const age = res?.age != null ? parseInt(res.age, 10) : NaN;
  const summary: FetchSummary = {
    source: source.key,
    status: res?.status ?? null,
    ok: !error,
    items_found: parsed?.items.length ?? rulesCount,
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
  const [rows, flags, details, rules] = await Promise.all([listStoredOffers(db), listFlags(db), listDetails(db), listBankRules(db)]);
  const { all } = evaluateAll(rows, flags, details, rules);
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
      const x = ok ? extractDetail(res.body) : null;
      const at = new Date().toISOString();
      await upsertDetail(db, o.key, o.detailUrl!, status, x, at);
      // 약관에서 읽은 재신청 기간은 은행 단위 규칙(doc_post)으로도 남긴다.
      if (x?.churnMonths != null && o.bank) await upsertDocPostRule(db, o.bank, x.churnMonths, x.churnText, o.detailUrl!, at);
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

export type AiSummary =
  | { skipped: "no_api_key" | "time_budget"; elapsedMs?: number }
  | { model: string; candidates: number; processed: number; failed: number; accepted: number; discarded: number; errors: string[] };

/** 정규식 뒤에도 비는 필드 — AI 대상 여부. (deposit_hold_*는 짝으로 본다) */
function missingFields(d: { expires_on: string | null; churn_months: number | null; dd_amount: number | null; dd_days: number | null; deposit_hold_amount: number | null; deposit_hold_days: number | null; apply_methods: unknown }): AiField[] {
  return AI_FIELDS.filter((f) => (d as Record<string, unknown>)[f] == null);
}

/**
 * 근거 있는 AI 추출 — expires_on·churn_months·dd_amount·dd_days·deposit_hold_amount 중 하나라도 빈 상세 글.
 * refresh가 20초 넘게 돌았으면 이번엔 건너뛴다. 키가 없으면 건너뛰고 보고만 한다 (refresh는 실패하지 않음).
 * 같은 글은 7일 뒤에만 다시 시도. 정규식·DoC 처닝 목록 값은 덮지 않는다 (비어 있는 칸만 채움).
 */
export async function aiExtract(db: D1Database, apiKey: string | null, refreshStartedMs: number): Promise<AiSummary> {
  if (!apiKey) return { skipped: "no_api_key" };
  const elapsed = Date.now() - refreshStartedMs;
  if (elapsed > AI_EXTRACT.startBudgetMs) return { skipped: "time_budget", elapsedMs: elapsed };

  const details = await listDetails(db);
  const now = Date.now();
  const todo = [...details.values()]
    .filter((d) => d.http_status != null && d.http_status >= 200 && d.http_status < 300 && (d.fine_print_text || d.glance_text))
    .filter((d) => ["expires_on", "churn_months", "dd_amount", "dd_days", "deposit_hold_amount"].some((f) => (d as Record<string, unknown>)[f] == null))
    .filter((d) => !d.ai_extracted_at || now - Date.parse(d.ai_extracted_at) >= AI_EXTRACT.retryAfterDays * 86_400_000)
    .slice(0, AI_EXTRACT.maxPerRefresh);

  const out = { model: AI_MODEL, candidates: todo.length, processed: 0, failed: 0, accepted: 0, discarded: 0, errors: [] as string[] };
  // 동시 4건 — 40건 × 수 초를 순서대로 기다리지 않게.
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      if (Date.now() - refreshStartedMs > AI_EXTRACT.hardStopMs) return; // 요청이 너무 길어지면 남은 건 다음 refresh로
      const d = todo[next++];
      const sent = [d.glance_text ? `Offer at a glance:\n${d.glance_text}` : "", d.fine_print_text ?? ""].join("\n\n").slice(0, AI_INPUT_MAX);
      try {
        const raw = await requestAiExtraction(apiKey, sent);
        const r = acceptWithEvidence(raw, sent, missingFields(d));
        await applyAiResult(db, d.offer_key, d.evidence ?? {}, r, new Date().toISOString());
        out.processed++;
        out.accepted += r.accepted.length;
        out.discarded += r.discarded.length;
      } catch (e) {
        out.failed++;
        // 키·헤더가 섞일 수 있는 원문 대신 오류 종류만.
        out.errors.push(`${d.offer_key.slice(0, 80)}: ${e instanceof Error ? e.name : "error"}`);
      }
    }
  };
  await Promise.all(Array.from({ length: AI_EXTRACT.concurrency }, worker));
  return out;
}

/** refresh 1회 — 활성 소스 전부 → 상세 글 → (시간 남으면) AI. */
export async function refreshAll(
  db: D1Database,
  trigger: "manual" | "cron",
  apiKey: string | null = null,
): Promise<{ sources: FetchSummary[]; details: DetailSummary | { error: string }; ai: AiSummary | { error: string } }> {
  const startedMs = Date.now();
  const sources: FetchSummary[] = [];
  for (const s of await listEnabledSources(db)) sources.push(await fetchSource(db, s, trigger));
  let details: DetailSummary | { error: string };
  try {
    details = await fetchDetails(db);
  } catch (e) {
    details = { error: e instanceof Error ? e.message : String(e) };
  }
  let ai: AiSummary | { error: string };
  try {
    ai = await aiExtract(db, apiKey, startedMs);
  } catch (e) {
    ai = { error: e instanceof Error ? e.name : "error" };
  }
  return { sources, details, ai };
}
