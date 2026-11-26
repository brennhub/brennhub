-- brennhub: Bank Bonus Tracker Phase 1b — 파생 조건 컬럼 + 내 표시(flags) + quickref CSV 소스 (2026-10-16).
-- ALTER TABLE ADD COLUMN은 SQLite에서 멱등이 아니다 — 1회만 적용.
-- 적용 (preview만 — prod 적용 금지):
--   preview : `wrangler d1 execute brennhub-auth-dev --env preview --remote --file=migrations/auth/015_bank_bonus_flags.sql`

-- 조건 (파서가 원문에서 보수적으로 파생, 모르면 NULL — lib/bank-bonus/derive.ts).
ALTER TABLE bb_offers ADD COLUMN dd_required INTEGER;
ALTER TABLE bb_offers ADD COLUMN dd_amount INTEGER;
ALTER TABLE bb_offers ADD COLUMN expires_on TEXT;            -- YYYY-MM-DD
ALTER TABLE bb_offers ADD COLUMN ca_eligible INTEGER;
ALTER TABLE bb_offers ADD COLUMN deposit_hold_amount INTEGER;
ALTER TABLE bb_offers ADD COLUMN deposit_hold_days INTEGER;
ALTER TABLE bb_offers ADD COLUMN in_branch INTEGER;
ALTER TABLE bb_offers ADD COLUMN hard_pull INTEGER;
ALTER TABLE bb_offers ADD COLUMN targeted INTEGER;
ALTER TABLE bb_offers ADD COLUMN is_offer INTEGER DEFAULT 1;
-- master 위치·메모, RSS 게시 시각.
ALTER TABLE bb_offers ADD COLUMN section TEXT;               -- checking | savings | business | state | region
ALTER TABLE bb_offers ADD COLUMN section_rank INTEGER;       -- 섹션 안 순번 (1부터)
ALTER TABLE bb_offers ADD COLUMN notes TEXT;                 -- 항목 아래 <p> 메모
ALTER TABLE bb_offers ADD COLUMN published_at TEXT;          -- RSS pubDate (ISO)

-- 내 표시 — offer_key = lib/bank-bonus/merge.ts의 병합 키 ("url:..." / "bank:...|type").
CREATE TABLE IF NOT EXISTS bb_offer_flags (
  id         INTEGER PRIMARY KEY,
  offer_key  TEXT NOT NULL UNIQUE,
  star       INTEGER NOT NULL DEFAULT 0,
  hidden     INTEGER NOT NULL DEFAULT 0,
  applied    INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  updated_at TEXT
);

-- quickref: 실제 데이터는 공개 Google Sheets CSV. 시트가 2021-12 이후 갱신되지 않아 비활성 보관.
UPDATE bb_sources
SET url = 'https://docs.google.com/spreadsheets/d/104UNYakOGcdLlROd-3WfGlzBoSghZho1MzTEDKYyqUA/export?format=csv',
    fetch_kind = 'csv',
    enabled = 0,
    notes = 'parked: sheet not updated since 2021-12 (newest expiration 2022-12-24); parser ready'
WHERE "key" = 'doc_quickref';
