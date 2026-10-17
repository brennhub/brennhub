-- brennhub: Bank Bonus Tracker Phase 2c-1 — 은행 공식 약관 수집 · 조건 체크리스트 · 부분값 중단 (2026-10-17).
-- ALTER TABLE ADD COLUMN은 멱등이 아니다 — 1회만 적용.
-- 적용 (preview만 — prod 적용 금지):
--   preview : `wrangler d1 execute brennhub-auth-dev --env preview --remote --file=migrations/auth/018_bank_bonus_official.sql`

-- 은행 공식 오퍼 페이지 (bb_offer_details.bank_offer_url) 본문 텍스트. 막힘·비200도 status·error를 남긴다.
CREATE TABLE IF NOT EXISTS bb_official_pages (
  id              INTEGER PRIMARY KEY,
  offer_key       TEXT NOT NULL UNIQUE,
  url             TEXT,
  fetched_at      TEXT,
  http_status     INTEGER,
  text            TEXT,                 -- 보이는 글자만, 24000자 상한 (약관·오퍼 상세 구간 우선)
  text_hash       TEXT,                 -- SHA-256 hex
  last_changed_at TEXT,                 -- text_hash가 바뀐 마지막 시각
  error           TEXT                  -- 막힘·비200·글자 부족 사유 (UI "공식 페이지 확인 불가")
);

-- 조건 체크리스트·자격·ACH·수수료 면제 (DoC 정규식 또는 DoC 원문에서 근거가 확인된 Cowork 값).
ALTER TABLE bb_offer_details ADD COLUMN requirements_json TEXT;   -- JSON [{order, portion, kind, text, amount, days, count, quote, source}]
ALTER TABLE bb_offer_details ADD COLUMN reapply_once_only INTEGER;
ALTER TABLE bb_offer_details ADD COLUMN eligibility_text TEXT;
ALTER TABLE bb_offer_details ADD COLUMN ach_push TEXT;            -- 'yes' | 'no' | 'unclear'
ALTER TABLE bb_offer_details ADD COLUMN ach_push_text TEXT;
ALTER TABLE bb_offer_details ADD COLUMN fee_waiver_text TEXT;
-- 공식 약관이 근거인 값 — JSON {필드: {value, quote, method: 'regex'|'cowork'}}. 표시 우선순위상 DoC 값보다 앞선다.
ALTER TABLE bb_offer_details ADD COLUMN official_fields TEXT;
-- DoC 글 게시일·최신 Update 날짜 — 약관이 Update보다 오래됐으면 "DoC 기준" 표시.
ALTER TABLE bb_offer_details ADD COLUMN doc_posted_at TEXT;
ALTER TABLE bb_offer_details ADD COLUMN doc_updated_at TEXT;
