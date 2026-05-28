-- brennhub auth: users 표시 이름(display_name) 컬럼 추가 (feat/profile, 2026-05-27).
-- 사용자가 직접 설정하는 커스텀 표시 이름. NULL이면 Google 원본 name 사용.
-- 표시 우선순위: display_name > name > email.
-- ⚠️ OAuth callback(upsertUserByGoogleSub)은 name(Google raw)만 갱신하고
--    display_name은 건드리지 않음 — 커스텀 이름이 매 로그인 시 덮어써지는 것 방지.
-- 적용: Brenn 수동.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/006_display_name.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/006_display_name.sql`
--   (`--env preview` flag는 D1을 안 바꿈 — DB 이름을 첫 인자로 직접 지정 필수.)
-- 잠금 위험 0 (nullable 컬럼 추가만).

ALTER TABLE users ADD COLUMN display_name TEXT;
