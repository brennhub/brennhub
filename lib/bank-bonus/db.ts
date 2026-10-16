import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { FreshnessRow, OfferFlags, OfferInput, PostRow, SourceRow, StoredOffer } from "./types";

/**
 * bank-bonus D1 접근 (AUTH_DB, bb_* 테이블 — migrations/auth/014_bank_bonus.sql, 015_bank_bonus_flags.sql).
 * AUTH_DB는 cloudflare-env.d.ts에 없어 repo 관례대로 인라인 캐스팅.
 */

type BankBonusEnv = { AUTH_DB?: D1Database };

export function getBankBonusDb(): D1Database | null {
  try {
    const { env } = getCloudflareContext();
    return (env as unknown as BankBonusEnv).AUTH_DB ?? null;
  } catch {
    return null;
  }
}

export const STALE_MS = 48 * 60 * 60 * 1000;

export async function listEnabledSources(db: D1Database): Promise<SourceRow[]> {
  const { results } = await db
    .prepare(`SELECT id, "key", name, url, kind, fetch_kind, enabled FROM bb_sources WHERE enabled = 1 ORDER BY weight DESC, id`)
    .all<SourceRow>();
  return results;
}

export type RunRecord = {
  sourceId: number;
  trigger: "manual" | "cron";
  startedAt: string;
  finishedAt: string;
  httpStatus: number | null;
  finalUrl: string | null;
  bodyLength: number | null;
  lastModified: string | null;
  ageSeconds: number | null;
  sourceAsOf: string | null;
  ok: boolean;
  error: string | null;
  itemsFound: number | null;
  itemsNew: number | null;
  itemsUpdated: number | null;
};

/** run 1행 기록 + 소스의 last_fetch_at/last_status 갱신. */
export async function recordRun(db: D1Database, r: RunRecord): Promise<void> {
  const lastStatus = r.ok ? `ok ${r.httpStatus}` : `error: ${r.error ?? r.httpStatus ?? "unknown"}`.slice(0, 300);
  await db.batch([
    db
      .prepare(
        `INSERT INTO bb_fetch_runs (source_id, "trigger", started_at, finished_at, http_status, final_url, body_length,
           last_modified, age_seconds, source_as_of, ok, error, items_found, items_new, items_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        r.sourceId, r.trigger, r.startedAt, r.finishedAt, r.httpStatus, r.finalUrl, r.bodyLength,
        r.lastModified, r.ageSeconds, r.sourceAsOf, r.ok ? 1 : 0, r.error, r.itemsFound, r.itemsNew, r.itemsUpdated,
      ),
    db.prepare(`UPDATE bb_sources SET last_fetch_at = ?, last_status = ? WHERE id = ?`).bind(r.finishedAt, lastStatus, r.sourceId),
  ]);
}

const COMPARED = [
  ["bank", "bank"],
  ["title", "title"],
  ["account_type", "accountType"],
  ["bonus_min", "bonusMin"],
  ["bonus_max", "bonusMax"],
  ["bonus_text", "bonusText"],
  ["state_text", "stateText"],
  ["nationwide", "nationwide"],
  ["dd_text", "ddText"],
  ["pull_text", "pullText"],
  ["cc_funding_text", "ccFundingText"],
  ["detail_url", "detailUrl"],
  ["pinned", "pinned"],
  ["raw_excerpt", "rawExcerpt"],
  ["dd_required", "ddRequired"],
  ["dd_amount", "ddAmount"],
  ["expires_on", "expiresOn"],
  ["ca_eligible", "caEligible"],
  ["deposit_hold_amount", "depositHoldAmount"],
  ["deposit_hold_days", "depositHoldDays"],
  ["in_branch", "inBranch"],
  ["hard_pull", "hardPull"],
  ["targeted", "targeted"],
  ["is_offer", "isOffer"],
  ["section", "section"],
  ["section_rank", "sectionRank"],
  ["notes", "notes"],
  ["published_at", "publishedAt"],
] as const;

type ExistingRow = { id: number; external_key: string; status: string } & Record<
  (typeof COMPARED)[number][0],
  unknown
>;

const BATCH = 50;

/**
 * upsert — 신규 insert(first_seen_at=now), 기존은 last_seen_at 갱신 + 바뀐 필드 반영.
 * marksGone이면 이번 run에 안 보인 active 항목을 gone 처리 (파싱 0건이면 건너뜀 — 파서 고장으로 전부 gone 방지).
 */
export async function upsertOffers(
  db: D1Database,
  sourceId: number,
  items: OfferInput[],
  now: string,
  marksGone: boolean,
): Promise<{ itemsNew: number; itemsUpdated: number }> {
  const cols = COMPARED.map(([c]) => c).join(", ");
  const { results } = await db
    .prepare(`SELECT id, external_key, status, ${cols} FROM bb_offers WHERE source_id = ?`)
    .bind(sourceId)
    .all<ExistingRow>();
  const existing = new Map(results.map((r) => [r.external_key, r]));

  const stmts: D1PreparedStatement[] = [];
  let itemsNew = 0;
  let itemsUpdated = 0;

  for (const item of items) {
    const values = COMPARED.map(([, k]) => item[k] ?? null);
    const status = item.status ?? "active";
    const prev = existing.get(item.externalKey);
    if (!prev) {
      itemsNew++;
      stmts.push(
        db
          .prepare(
            `INSERT INTO bb_offers (source_id, external_key, ${cols}, first_seen_at, last_seen_at, status)
             VALUES (?, ?, ${COMPARED.map(() => "?").join(", ")}, ?, ?, ?)`,
          )
          .bind(sourceId, item.externalKey, ...values, now, now, status),
      );
      continue;
    }
    const changed = prev.status !== status || COMPARED.some(([c], i) => (prev[c] ?? null) !== values[i]);
    if (changed) {
      itemsUpdated++;
      stmts.push(
        db
          .prepare(
            `UPDATE bb_offers SET ${COMPARED.map(([c]) => `${c} = ?`).join(", ")}, last_seen_at = ?, status = ? WHERE id = ?`,
          )
          .bind(...values, now, status, prev.id),
      );
    } else {
      stmts.push(db.prepare(`UPDATE bb_offers SET last_seen_at = ? WHERE id = ?`).bind(now, prev.id));
    }
  }

  if (marksGone && items.length > 0) {
    stmts.push(
      db
        .prepare(`UPDATE bb_offers SET status = 'gone' WHERE source_id = ? AND status = 'active' AND last_seen_at < ?`)
        .bind(sourceId, now),
    );
  }

  for (let i = 0; i < stmts.length; i += BATCH) await db.batch(stmts.slice(i, i + BATCH));
  return { itemsNew, itemsUpdated };
}

const STORED_COLUMNS = `o.id, s."key" AS source_key, s.name AS source_name, o.bank, o.title, o.account_type,
  o.bonus_min, o.bonus_max, o.bonus_text, o.state_text, o.nationwide, o.dd_text, o.pull_text, o.cc_funding_text,
  o.detail_url, o.pinned, o.first_seen_at, o.last_seen_at, o.status, o.dd_required, o.dd_amount, o.expires_on,
  o.ca_eligible, o.deposit_hold_amount, o.deposit_hold_days, o.in_branch, o.hard_pull, o.targeted, o.is_offer,
  o.section, o.section_rank, o.notes, o.published_at`;

/** 병합 대상 — active 행 중 RSS(글) 제외. 필터·점수는 merge/score에서. */
export async function listStoredOffers(db: D1Database): Promise<StoredOffer[]> {
  const { results } = await db
    .prepare(
      `SELECT ${STORED_COLUMNS} FROM bb_offers o JOIN bb_sources s ON s.id = o.source_id
       WHERE o.status = 'active' AND s.fetch_kind <> 'rss'
       ORDER BY s.weight DESC, s.id, o.id`,
    )
    .all<StoredOffer>();
  return results;
}

/** 최근 RSS 글 — days일 이내 게시 또는 고정(미래 날짜). */
export async function listPosts(db: D1Database, days = 14, now = Date.now()): Promise<PostRow[]> {
  const since = new Date(now - days * 86_400_000).toISOString();
  const { results } = await db
    .prepare(
      `SELECT o.id, o.title, o.detail_url, o.pinned, o.published_at, o.first_seen_at, o.bonus_max, o.state_text
       FROM bb_offers o JOIN bb_sources s ON s.id = o.source_id
       WHERE s.fetch_kind = 'rss' AND (o.pinned = 1 OR COALESCE(o.published_at, o.first_seen_at) >= ?)
       ORDER BY o.pinned DESC, COALESCE(o.published_at, o.first_seen_at) DESC
       LIMIT 60`,
    )
    .bind(since)
    .all<PostRow>();
  return results;
}

export async function listFlags(db: D1Database): Promise<Map<string, OfferFlags>> {
  const { results } = await db
    .prepare(`SELECT offer_key, star, hidden, applied, note FROM bb_offer_flags`)
    .all<OfferFlags & { offer_key: string }>();
  return new Map(results.map(({ offer_key, ...f }) => [offer_key, f]));
}

export type FlagPatch = Partial<Pick<OfferFlags, "star" | "hidden" | "applied" | "note">>;

/** 넘어온 필드만 바꾸고 나머지는 유지하는 upsert. */
export async function upsertFlag(db: D1Database, offerKey: string, patch: FlagPatch): Promise<OfferFlags> {
  const prev = await db
    .prepare(`SELECT star, hidden, applied, note FROM bb_offer_flags WHERE offer_key = ?`)
    .bind(offerKey)
    .first<OfferFlags>();
  const next: OfferFlags = { star: 0, hidden: 0, applied: 0, note: null, ...prev, ...patch };
  await db
    .prepare(
      `INSERT INTO bb_offer_flags (offer_key, star, hidden, applied, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(offer_key) DO UPDATE SET star = excluded.star, hidden = excluded.hidden,
         applied = excluded.applied, note = excluded.note, updated_at = excluded.updated_at`,
    )
    .bind(offerKey, next.star, next.hidden, next.applied, next.note, new Date().toISOString())
    .run();
  return next;
}
export async function listRuns(db: D1Database, limit = 50) {
  const { results } = await db
    .prepare(
      `SELECT r.*, s."key" AS source_key, s.name AS source_name
       FROM bb_fetch_runs r JOIN bb_sources s ON s.id = r.source_id
       ORDER BY r.id DESC LIMIT ?`,
    )
    .bind(limit)
    .all();
  return results;
}

/** 소스별 최근 run + 마지막 성공 시각. stale = 마지막 성공이 48시간보다 오래됨(또는 없음). */
export async function listFreshness(db: D1Database, now = Date.now()): Promise<FreshnessRow[]> {
  const { results } = await db
    .prepare(
      `SELECT s.id, s."key" AS "key", s.name, s.enabled, s.last_fetch_at, s.last_status,
         r.http_status, r.last_modified, r.age_seconds, r.source_as_of, r.items_new, r.items_found, r.error,
         (SELECT MAX(o.finished_at) FROM bb_fetch_runs o WHERE o.source_id = s.id AND o.ok = 1) AS last_ok_at
       FROM bb_sources s
       LEFT JOIN bb_fetch_runs r ON r.id = (SELECT MAX(x.id) FROM bb_fetch_runs x WHERE x.source_id = s.id)
       ORDER BY s.id`,
    )
    .all<Omit<FreshnessRow, "stale">>();
  return results.map((r) => ({
    ...r,
    stale: !r.last_ok_at || now - Date.parse(r.last_ok_at) > STALE_MS,
  }));
}
