-- brennhub auth: sessions 테이블 (1-A, 2026-05-20+).
-- 세션 정책: 30일 만료, server-side D1 저장 (강제 로그아웃·감사 가능).
-- 적용: Brenn 수동 `wrangler d1 execute brennhub-auth --remote --file=migrations/auth/002_sessions.sql`
--      (preview env 동일 `--env preview --remote`).
-- 보안 note (1-B 결정): session id를 평문 vs 해시 저장 — 1-B Plan §보안 체크리스트에서 확정.

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT    PRIMARY KEY,           -- 32-byte random (cookie 값 또는 그 해시 — 1-B 결정)
  user_id      TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,              -- unix epoch ms
  expires_at   INTEGER NOT NULL,              -- unix epoch ms (created_at + 30d)
  user_agent   TEXT                           -- 로그인 시점 UA (감사용, optional)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
