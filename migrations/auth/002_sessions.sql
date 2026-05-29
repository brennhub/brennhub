-- brennhub auth: sessions 테이블 (1-A, 2026-05-20+).
-- 세션 정책: 30일 만료, server-side D1 저장 (강제 로그아웃·감사 가능).
-- 적용: Brenn 수동.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/002_sessions.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/002_sessions.sql`
--   (`--env preview` flag는 D1을 안 바꿈 — DB 이름을 첫 인자로 직접 지정 필수.)
-- 보안: 1-B에서 SHA-256 해시 저장 채택. cookie 값(32-byte hex 평문)을 SHA-256 → 본 테이블 `id` PK.
--       DB 누설 시에도 cookie 위조 불가.

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT    PRIMARY KEY,           -- 32-byte random (cookie 값 또는 그 해시 — 1-B 결정)
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,              -- unix epoch ms
  expires_at   INTEGER NOT NULL,              -- unix epoch ms (created_at + 30d)
  user_agent   TEXT                           -- 로그인 시점 UA (감사용, optional)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
