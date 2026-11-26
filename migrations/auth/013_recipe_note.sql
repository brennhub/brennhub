-- brennhub: 레시피 받아쓰기 — 숏링크 레시피 저장/수정 (recipe-note, 2026-08-14).
-- AUTH_DB(brennhub-auth) 도메인 확장 — 별도 DB 미생성 정책 일관.
-- 로그인 없음 — 수정 권한은 edit_token 보유로만 판정 (생성자 localStorage 보관).
-- ingredients·steps는 JSON 문자열 (lib/recipe-note/types.ts Ingredient[]·Step[]).
-- ip_hash는 생성 rate-limit(30s) 전용 (feedback/maze/game_scores 패턴, 원문 IP 저장 X).
-- IF NOT EXISTS 멱등성.
-- 적용: Brenn 또는 thread 위임.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/013_recipe_note.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/013_recipe_note.sql`
-- 잠금 위험 0 (ADD TABLE).

CREATE TABLE IF NOT EXISTS recipe_note_recipes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  "key"       TEXT NOT NULL,               -- 숏링크 키, base62 8자 (lib/recipe-note/key.ts).
  edit_token  TEXT NOT NULL,               -- 수정 토큰, base62 24자. 생성자만 보관.
  title       TEXT NOT NULL,
  video_url   TEXT,                        -- http(s)만 (서버 검증). 열람 화면 href로 나감.
  channel     TEXT,
  ingredients TEXT NOT NULL,               -- JSON 배열 — Ingredient[]
  steps       TEXT NOT NULL,               -- JSON 배열 — Step[]
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash     TEXT                         -- SHA-256(IP) — rate-limit 전용.
);

-- 숏링크 조회의 유일한 경로. 컬럼에 UNIQUE를 또 붙이면 같은 인덱스가 두 벌 생기므로
-- 제약은 이 인덱스 하나로 건다 (기획서의 idx 이름 유지).
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_note_key ON recipe_note_recipes ("key");
-- rate-limit 조회: ip_hash + 최근 created_at.
CREATE INDEX IF NOT EXISTS idx_recipe_note_ip ON recipe_note_recipes (ip_hash, created_at DESC);
