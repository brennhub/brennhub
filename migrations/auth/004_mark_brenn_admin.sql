-- brennhub auth: Brenn 본인 admin 마킹 (1-A feat/admin, 2026-05-27).
-- google_sub은 stable Google ID (이메일 변경되어도 불변).
-- 적용: Brenn 수동.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/004_mark_brenn_admin.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/004_mark_brenn_admin.sql`
--   (`--env preview` flag는 D1을 안 바꿈 — DB 이름 직접 지정 필수.)
-- ⚠️ 잠금 방지: 새 middleware 활성화(main 머지) 전에 prod 적용 필수. 마킹 누락 시 본인도 /admin 접근 불가.
-- 검증: `SELECT google_sub, email, is_admin FROM users WHERE is_admin = 1`

UPDATE users SET is_admin = 1 WHERE google_sub = '107819545640412431499';
