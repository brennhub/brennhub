-- 픽셀 미로 만들기: 미로 공유 저장 (Cloudflare D1).
-- binding: MAZE_DB (wrangler.jsonc — prod 'brennhub-maze' + env.preview 'brennhub-maze-dev').
-- payload = JSON.stringify(MazeProject) — schemaVersion 자체가 payload 안 (D1은 schema-agnostic).
-- 0.14.0 (P4a): ip_hash 추가 — feedback 패턴 응용 rate limit (30s 윈도).

CREATE TABLE IF NOT EXISTS maze (
  short_id    TEXT PRIMARY KEY CHECK (length(short_id) = 6),  -- 6자 알파넘 숏링크 ID
  payload     TEXT NOT NULL,                                  -- MazeProject JSON
  created_at  INTEGER NOT NULL,                               -- epoch ms
  ip_hash     TEXT                                            -- IP SHA-256 hex (rate limit 어뷰즈 방어)
);

CREATE INDEX IF NOT EXISTS idx_maze_created_at ON maze(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maze_ip_hash ON maze(ip_hash, created_at DESC);
