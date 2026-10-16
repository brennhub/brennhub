import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { FreshnessRow, OfferInput, OfferRow, SourceRow } from "./types";

/**
 * bank-bonus D1 접근 (AUTH_DB, bb_* 테이블 — migrations/auth/014_bank_bonus.sql).
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
    const prev = existing.get(item.externalKey);
    if (!prev) {
      itemsNew++;
      stmts.push(
        db
          .prepare(
            `INSERT INTO bb_offers (source_id, external_key, ${cols}, first_seen_at, last_seen_at, status)
             VALUES (?, ?, ${COMPARED.map(() => "?").join(", ")}, ?, ?, 'active')`,
          )
          .bind(sourceId, item.externalKey, ...values, now, now),
      );
      continue;
    }
    const changed = prev.status !== "active" || COMPARED.some(([c], i) => (prev[c] ?? null) !== values[i]);
    if (changed) {
      itemsUpdated++;
      stmts.push(
        db
          .prepare(
            `UPDATE bb_offers SET ${COMPARED.map(([c]) => `${c} = ?`).join(", ")}, last_seen_at = ?, status = 'active' WHERE id = ?`,
          )
          .bind(...values, now, prev.id),
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

export type OfferFilters = {
  type: string | null;
  caEligible: boolean;
  minBonus: number | null;
  status: string;
  sort: "asc" | "desc";
};

export async function listOffers(db: D1Database, f: OfferFilters): Promise<OfferRow[]> {
  const where: string[] = [];
  const args: unknown[] = [];
  if (f.status !== "all") {
    where.push("o.status = ?");
    args.push(f.status);
  }
  if (f.type) {
    where.push("o.account_type = ?");
    args.push(f.type);
  }
  if (f.caEligible) where.push(`(o.nationwide = 1 OR (', ' || o.state_text || ',') LIKE '%, CA,%')`);
  if (f.minBonus != null) {
    where.push("o.bonus_max >= ?");
    args.push(f.minBonus);
  }
  const sql = `SELECT o.id, s."key" AS source_key, s.name AS source_name, o.bank, o.title, o.account_type,
      o.bonus_min, o.bonus_max, o.bonus_text, o.state_text, o.nationwide, o.dd_text, o.pull_text,
      o.cc_funding_text, o.detail_url, o.pinned, o.first_seen_at, o.last_seen_at, o.status
    FROM bb_offers o JOIN bb_sources s ON s.id = o.source_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY o.bonus_max IS NULL, o.bonus_max ${f.sort === "asc" ? "ASC" : "DESC"}, o.bank
    LIMIT 1000`;
  const { results } = await db.prepare(sql).bind(...args).all<OfferRow>();
  return results;
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
