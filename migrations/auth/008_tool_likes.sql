-- brennhub: 도구별 좋아요 (Hub Likes Phase 1, 2026-06-01).
-- AUTH_DB(brennhub-auth) 도메인 확장 — 별도 DB 미생성 정책 일관.
-- 로그인 사용자만 좋아요 가능. 게스트 UI는 noop + 로그인 안내 toast.
-- count 집계 = COUNT(*) WHERE tool_slug. has_liked = 행 존재 여부.
-- IF NOT EXISTS 멱등성 — 여러 번 실행해도 무해.
-- 적용: Brenn 또는 thread 위임.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/008_tool_likes.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/008_tool_likes.sql`
-- 잠금 위험 0 (ADD TABLE).

CREATE TABLE IF NOT EXISTS tool_likes (
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_slug  TEXT    NOT NULL,             -- tools-registry slug. API allowlist로 검증.
  created_at INTEGER NOT NULL,              -- unix epoch ms.
  PRIMARY KEY (user_id, tool_slug)
);

CREATE INDEX IF NOT EXISTS idx_tool_likes_slug ON tool_likes (tool_slug);
