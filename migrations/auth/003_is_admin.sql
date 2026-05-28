-- brennhub auth: users 테이블에 is_admin 컬럼 추가 (1-A feat/admin, 2026-05-27).
-- 기본 0 (일반 사용자). admin 마킹은 004로 별도 SQL (schema/data 분리).
-- 적용: Brenn 수동.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/003_is_admin.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/003_is_admin.sql`
--   (`--env preview` flag는 D1을 안 바꿈 — DB 이름을 첫 인자로 직접 지정 필수.)

ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
