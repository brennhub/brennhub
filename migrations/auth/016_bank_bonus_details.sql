-- brennhub: Bank Bonus Tracker Phase 1c — 보너스 괄호 메모 · 신규 기준선 · DoC 상세 글 추출 (2026-10-16).
-- ALTER TABLE ADD COLUMN은 멱등이 아니다 — 1회만 적용.
-- 적용 (preview만 — prod 적용 금지):
--   preview : `wrangler d1 execute brennhub-auth-dev --env preview --remote --file=migrations/auth/016_bank_bonus_details.sql`

-- "($900 With Savings)" 같은 제목 괄호 금액 — 보너스 범위와 분리해 메모로.
ALTER TABLE bb_offers ADD COLUMN bonus_note TEXT;

-- 신규 판정 기준선: 소스의 첫 성공 run 종료 시각. 그 run에서 처음 본 항목은 "신규" 아님.
ALTER TABLE bb_sources ADD COLUMN first_ok_at TEXT;
UPDATE bb_sources
SET first_ok_at = (SELECT MIN(r.finished_at) FROM bb_fetch_runs r WHERE r.source_id = bb_sources.id AND r.ok = 1)
WHERE first_ok_at IS NULL;

-- DoC 상세 글에서 코드(정규식)로 뽑은 조건. offer_key = lib/bank-bonus/merge.ts 병합 키. 모르면 NULL.
CREATE TABLE IF NOT EXISTS bb_offer_details (
  id                     INTEGER PRIMARY KEY,
  offer_key              TEXT NOT NULL UNIQUE,
  detail_url             TEXT,
  fetched_at             TEXT,
  http_status            INTEGER,
  fine_print_text        TEXT,              -- "The Fine Print" 섹션 (없으면 글 전체), 4000자 상한.
  expires_on             TEXT,              -- YYYY-MM-DD
  apply_methods          TEXT,              -- JSON 배열: 'online' | 'branch' | 'code' | 'invite'
  dd_amount              INTEGER,
  dd_days                INTEGER,
  dd_text                TEXT,
  churn_months           INTEGER,
  churn_text             TEXT,
  early_termination_text TEXT,
  monthly_fee_text       TEXT,
  bank_offer_url         TEXT,
  post_expired           INTEGER,           -- 글 제목 "[Expired]" 또는 "Deal has ended" → 1.
  extraction_method      TEXT DEFAULT 'regex'
);
