-- brennhub: Bank Bonus Tracker — 은행 계좌 보너스 수집 (bank-bonus, 2026-10-16). admin 전용 · devOnly.
-- AUTH_DB(brennhub-auth) 도메인 확장 — 별도 DB 미생성 정책 일관. 테이블 prefix bb_.
-- 시각 컬럼은 전부 ISO-8601 UTC 문자열 (new Date().toISOString()).
-- IF NOT EXISTS / INSERT OR IGNORE 멱등성.
-- 적용 (Phase 1은 preview만 — prod 적용 금지):
--   preview : `wrangler d1 execute brennhub-auth-dev --env preview --remote --file=migrations/auth/014_bank_bonus.sql`
-- 잠금 위험 0 (ADD TABLE).

CREATE TABLE IF NOT EXISTS bb_sources (
  id            INTEGER PRIMARY KEY,
  "key"         TEXT NOT NULL UNIQUE,      -- 파서 dispatch 키 (lib/bank-bonus/engine.ts).
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  kind          TEXT NOT NULL,             -- 'aggregator' | 'official' | 'community'
  fetch_kind    TEXT NOT NULL,             -- 'html' | 'rss'
  enabled       INTEGER NOT NULL DEFAULT 1,
  weight        INTEGER NOT NULL DEFAULT 1,
  last_fetch_at TEXT,
  last_status   TEXT,                      -- 'ok 200' / 'error: ...'
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS bb_fetch_runs (
  id            INTEGER PRIMARY KEY,
  source_id     INTEGER NOT NULL,
  "trigger"     TEXT NOT NULL,             -- 'manual' | 'cron'
  started_at    TEXT NOT NULL,
  finished_at   TEXT,
  http_status   INTEGER,
  final_url     TEXT,
  body_length   INTEGER,
  last_modified TEXT,                      -- 응답 Last-Modified 헤더 원문.
  age_seconds   INTEGER,                   -- 응답 Age 헤더 (캐시 체류 시간).
  source_as_of  TEXT,                      -- 페이지가 스스로 밝힌 기준 시점.
  ok            INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  items_found   INTEGER,
  items_new     INTEGER,
  items_updated INTEGER
);
CREATE INDEX IF NOT EXISTS idx_bb_runs_source ON bb_fetch_runs (source_id, id DESC);

CREATE TABLE IF NOT EXISTS bb_offers (
  id              INTEGER PRIMARY KEY,
  source_id       INTEGER NOT NULL,
  external_key    TEXT NOT NULL,           -- RSS guid / master 헤딩 정규화 텍스트.
  bank            TEXT,
  title           TEXT,
  account_type    TEXT,                    -- 'checking' | 'savings' | 'business' | 'unknown'
  bonus_min       INTEGER,
  bonus_max       INTEGER,
  bonus_text      TEXT,
  state_text      TEXT,                    -- NULL = 전국 또는 판정 불가 (nationwide로 구분).
  nationwide      INTEGER,                 -- 1 / 0 / NULL(판정 불가).
  dd_text         TEXT,
  pull_text       TEXT,
  cc_funding_text TEXT,
  detail_url      TEXT,
  pinned          INTEGER NOT NULL DEFAULT 0,
  first_seen_at   TEXT NOT NULL,
  last_seen_at    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'gone'
  raw_excerpt     TEXT,
  UNIQUE (source_id, external_key)
);
CREATE INDEX IF NOT EXISTS idx_bb_offers_status ON bb_offers (status, bonus_max DESC);

INSERT OR IGNORE INTO bb_sources ("key", name, url, kind, fetch_kind, enabled, notes) VALUES
  ('doc_master',   'DoC Best Bank Bonuses', 'https://www.doctorofcredit.com/best-bank-account-bonuses/',            'aggregator', 'html', 1, NULL),
  ('doc_rss',      'DoC Bank Bonuses RSS',  'https://www.doctorofcredit.com/category/bank-account-bonuses/feed/',  'aggregator', 'rss',  1, NULL),
  ('doc_quickref', 'DoC Quick Reference',   'https://www.doctorofcredit.com/bank-account-quick-reference-table/',  'aggregator', 'html', 0, 'parser not written yet');
