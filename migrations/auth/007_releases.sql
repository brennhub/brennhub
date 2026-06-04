-- brennhub: 릴리스 노트 전용 테이블 (Union 모델 — 파일=소스, D1=admin 오버레이/tombstone/신규).
-- 전역 데이터(유저 무관). brennhub-auth DB에 위치 — 별도 DB 회피, 1-A 패턴 일관.
-- 적용: Brenn 수동.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/007_releases.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/007_releases.sql`
--   (`--env preview` flag는 D1을 안 바꿈 — DB 이름 첫 인자 직접 지정 필수.)
-- 잠금 위험 0 (CREATE TABLE only). Seed insert 없음 — Union 모델에서 lib/releases.ts 9건이
-- D1 빈 상태에서도 자동 표시됨.

CREATE TABLE IF NOT EXISTS releases (
  id         TEXT    PRIMARY KEY,             -- 파일 entry는 명시적 안정 id; admin 신규는 nanoid 등.
  date       TEXT    NOT NULL,                -- YYYY-MM-DD
  tool       TEXT    NOT NULL,                -- tools-registry slug | 'site'
  title_ko   TEXT    NOT NULL,
  title_en   TEXT    NOT NULL,
  body_ko    TEXT    NOT NULL,
  body_en    TEXT    NOT NULL,
  kind       TEXT,                            -- 'new'|'improved'|'fixed' | NULL
  deleted    INTEGER NOT NULL DEFAULT 0,      -- 1 = 파일 entry tombstone (admin이 가림)
  created_at INTEGER NOT NULL,                -- unix ms
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_releases_date    ON releases(date);
CREATE INDEX IF NOT EXISTS idx_releases_deleted ON releases(deleted);
