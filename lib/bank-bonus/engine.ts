/**
 * fetch 엔진 — 소스 1개를 받아와 파싱 → bb_offers upsert → bb_fetch_runs 기록.
 * 파서는 source.key로 고른다. AI 호출 없음 (코드 파싱만).
 */

import { DETAIL_FETCH, OFFICIAL_FETCH } from "./config";
import { coworkIngest, type CoworkSummary } from "./cowork";
import {
  listBankRules,
  listDetails,
  listEnabledSources,
  listFlags,
  listOfficialPages,
  listStoredOffers,
  recordRun,
  saveOfficialFields,
  upsertOfficialPage,
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
import { officialRegexFields, officialText, officialUsability, sha256Hex } from "./official";
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
  const [rows, flags, details, rules, pages] = await Promise.all([
    listStoredOffers(db),
    listFlags(db),
    listDetails(db),
    listBankRules(db),
    listOfficialPages(db),
  ]);
  const { all } = evaluateAll(rows, flags, details, rules, pages);
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
      // 개인 계좌 오퍼면 "business" 문장은 재신청 근거에서 뺀다 (사업자 규칙이 개인 오퍼에 붙지 않게).
      const x = ok ? extractDetail(res.body, { personal: o.accountType !== "business" }) : null;
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

export type OfficialSummary = {
  candidates: number;
  fetched: number;
  usable: number;
  unusable: number;
  skippedRecent: number;
  /** 은행·사유 — 막힘(403)·비200·스크립트로 그려진 페이지 등. */
  unusableReasons: string[];
};

/**
 * 은행 공식 오퍼 페이지 — 지금 할 만한 오퍼 + 관심(⭐) 오퍼의 bank_offer_url.
 * 보너스 큰 순 최대 15건, 300ms 간격, 7일 캐시, DoC와 같은 데스크톱 UA. 막히거나 비200이면 status·error만 남긴다.
 * 쓸 만한 본문이면 정규식으로 확실한 값(재신청 기간·1회 한정·가입 자격)을 official_fields에 넣는다 (Cowork 공식 값은 덮지 않음).
 */
export async function fetchOfficial(db: D1Database): Promise<OfficialSummary> {
  const [rows, flags, details, rules, pages] = await Promise.all([
    listStoredOffers(db),
    listFlags(db),
    listDetails(db),
    listBankRules(db),
    listOfficialPages(db),
  ]);
  const { all } = evaluateAll(rows, flags, details, rules, pages);
  const now = Date.now();
  const wanted = all.filter((o) => (o.doable || o.flags.star) && details.get(o.key)?.bank_offer_url).sort(byBonus);
  const fresh = (key: string) => {
    const at = pages.get(key)?.fetched_at;
    return !!at && now - Date.parse(at) < OFFICIAL_FETCH.refetchAfterDays * 86_400_000;
  };
  const todo = wanted.filter((o) => !fresh(o.key)).slice(0, OFFICIAL_FETCH.maxPerRefresh);
  const out: OfficialSummary = {
    candidates: wanted.length,
    fetched: 0,
    usable: 0,
    unusable: 0,
    skippedRecent: wanted.length - wanted.filter((o) => !fresh(o.key)).length,
    unusableReasons: [],
  };

  for (let i = 0; i < todo.length; i++) {
    const o = todo[i];
    const d = details.get(o.key)!;
    const url = d.bank_offer_url!;
    if (i > 0) await sleep(OFFICIAL_FETCH.gapMs);
    const at = new Date().toISOString();
    let status: number | null = null;
    let why: string | null = null;
    let text = "";
    let html = "";
    try {
      const res = await fetchFresh(url);
      status = res.status;
      html = res.body;
      text = officialText(html);
      why = officialUsability(res.status, html, text);
    } catch (e) {
      why = `fetch failed: ${e instanceof Error ? e.message : String(e)}`;
    }
    out.fetched++;
    const usable = !why;
    await upsertOfficialPage(db, o.key, url, status, usable ? text : null, usable ? await sha256Hex(text) : null, why, at);
    if (!usable) {
      out.unusable++;
      out.unusableReasons.push(`${o.bank ?? o.key}: ${why}`);
      continue;
    }
    out.usable++;
    // 정규식 공식 값은 새 본문 기준으로 갈아끼우되, Cowork가 공식 본문에서 근거를 확인한 값은 둔다.
    const merged = { ...(d.official_fields ?? {}) };
    for (const [k, v] of Object.entries(merged)) if (v?.method === "regex") delete merged[k];
    for (const [k, v] of Object.entries(officialRegexFields(text, o.accountType !== "business"))) if (!merged[k]) merged[k] = v;
    await saveOfficialFields(db, o.key, merged, at);
  }
  return out;
}

/** refresh 1회 — 활성 소스 전부 → 상세 글 → 은행 공식 페이지 → Cowork 추출 파일 반영. 외부 AI 호출 없음. */
export async function refreshAll(
  db: D1Database,
  trigger: "manual" | "cron",
): Promise<{
  sources: FetchSummary[];
  details: DetailSummary | { error: string };
  official: OfficialSummary | { error: string };
  cowork: CoworkSummary | { error: string };
}> {
  const sources: FetchSummary[] = [];
  for (const s of await listEnabledSources(db)) sources.push(await fetchSource(db, s, trigger));
  let details: DetailSummary | { error: string };
  try {
    details = await fetchDetails(db);
  } catch (e) {
    details = { error: e instanceof Error ? e.message : String(e) };
  }
  let official: OfficialSummary | { error: string };
  try {
    official = await fetchOfficial(db);
  } catch (e) {
    official = { error: e instanceof Error ? e.message : String(e) };
  }
  let cowork: CoworkSummary | { error: string };
  try {
    cowork = await coworkIngest(db);
  } catch (e) {
    cowork = { error: e instanceof Error ? e.message : String(e) };
  }
  return { sources, details, official, cowork };
}
