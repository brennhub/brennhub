-- brennhub auth: users 테이블 (1-A, 2026-05-20+).
-- 도메인: 횡단 인프라 (도구 무관). D1 binding: AUTH_DB (database_name: brennhub-auth / brennhub-auth-dev).
-- 적용: Brenn 수동 `wrangler d1 execute brennhub-auth --remote --file=migrations/auth/001_users.sql`
--      (preview env 동일 `--env preview --remote`).

CREATE TABLE IF NOT EXISTS users (
  id            TEXT    PRIMARY KEY,           -- random 16-byte hex (app 생성)
  google_sub    TEXT    NOT NULL UNIQUE,       -- Google OAuth 'sub' claim (stable user ID)
  email         TEXT    NOT NULL,              -- Google account email (변경 가능 — sub가 진짜 key)
  name          TEXT,                          -- Google profile display name
  avatar_url    TEXT,                          -- Google profile picture URL
  created_at    INTEGER NOT NULL,              -- unix epoch ms
  last_login_at INTEGER NOT NULL               -- unix epoch ms
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
