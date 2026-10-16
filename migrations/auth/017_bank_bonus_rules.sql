-- brennhub: Bank Bonus Tracker Phase 2a — 겹친(스택) 오퍼 · 재신청 규칙 층 · 근거 있는 AI 추출 (2026-10-16).
-- ALTER TABLE ADD COLUMN은 멱등이 아니다 — 1회만 적용.
-- 적용 (preview만 — prod 적용 금지):
--   preview : `wrangler d1 execute brennhub-auth-dev --env preview --remote --file=migrations/auth/017_bank_bonus_rules.sql`

-- 은행 단위 재신청 규칙. 표시 우선순위: manual > official > doc_post > doc_churn > ai (lib/bank-bonus/rules.ts).
CREATE TABLE IF NOT EXISTS bb_bank_rules (
  id           INTEGER PRIMARY KEY,
  bank         TEXT NOT NULL,
  churn_months INTEGER,
  churn_text   TEXT,
  source       TEXT NOT NULL,            -- 'doc_churn' | 'doc_post' | 'ai' | 'official' | 'manual'
  source_url   TEXT,
  evidence     TEXT,                     -- 근거 원문 문장
  verified_at  TEXT,
  UNIQUE (bank, source)
);

-- 겹친 오퍼: 직접입금만으로 받는 기본 금액 / 예치금까지 채운 총액 / 총액 조건 코드('savings' | 'top_tier').
ALTER TABLE bb_offers ADD COLUMN bonus_base INTEGER;
ALTER TABLE bb_offers ADD COLUMN bonus_total_with_deposit INTEGER;
ALTER TABLE bb_offers ADD COLUMN bonus_total_note TEXT;

-- 상세 글: 근거·AI·요약 원문.
ALTER TABLE bb_offer_details ADD COLUMN evidence TEXT;            -- JSON {필드: {quote, method: 'regex'|'ai'}}
ALTER TABLE bb_offer_details ADD COLUMN ai_extracted_at TEXT;
ALTER TABLE bb_offer_details ADD COLUMN glance_text TEXT;         -- "Offer at a glance" 목록 평문
-- 상세 글에서 읽은 겹친 오퍼 값 (master 제목 값보다 우선).
ALTER TABLE bb_offer_details ADD COLUMN bonus_base INTEGER;
ALTER TABLE bb_offer_details ADD COLUMN bonus_total_with_deposit INTEGER;
ALTER TABLE bb_offer_details ADD COLUMN bonus_total_note TEXT;
ALTER TABLE bb_offer_details ADD COLUMN deposit_hold_amount INTEGER;
ALTER TABLE bb_offer_details ADD COLUMN deposit_hold_days INTEGER;
ALTER TABLE bb_offer_details ADD COLUMN deposit_hold_scope TEXT;  -- 'extra'(겹친 부분만) | 'base'(기본 보너스도 예치 필요)

INSERT OR IGNORE INTO bb_sources ("key", name, url, kind, fetch_kind, enabled, notes) VALUES
  ('doc_churn', 'DoC Churnable Bank Bonuses', 'https://www.doctorofcredit.com/a-list-of-churnable-bank-account-bonuses/', 'aggregator', 'html', 1, 'writes bb_bank_rules, not offers');
