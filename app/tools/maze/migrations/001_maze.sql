-- 픽셀 미로 만들기: 미로 공유 저장 (Cloudflare D1).
-- binding: MAZE_DB (예정 — P2 공유 API task에서 wrangler.jsonc 배선).
-- payload = JSON.stringify(MazeProject) (lib/maze/types.ts canonical).

CREATE TABLE IF NOT EXISTS maze (
  short_id    TEXT PRIMARY KEY CHECK (length(short_id) = 6),  -- 6자 숏링크 ID
  payload     TEXT NOT NULL,                                  -- MazeProject JSON
  created_at  INTEGER NOT NULL                                -- epoch ms
);

CREATE INDEX IF NOT EXISTS idx_maze_created_at ON maze(created_at DESC);
