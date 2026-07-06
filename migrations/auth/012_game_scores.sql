-- brennhub: 게임별 랭킹(leaderboard) — 익명 점수 제출/상위 N 조회 (Arcade, 2026-07-05).
-- AUTH_DB(brennhub-auth) 도메인 확장 — 별도 DB 미생성 정책 일관.
-- 익명 — user 추적 X. name(1~12자)·score(=kills)·created_at. ip_hash는 rate-limit(30s)용 (feedback/maze 패턴).
-- IF NOT EXISTS 멱등성.
-- 적용: Brenn 또는 thread 위임.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/012_game_scores.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/012_game_scores.sql`
-- 잠금 위험 0 (ADD TABLE).

CREATE TABLE IF NOT EXISTS game_scores (
  tool_slug  TEXT    NOT NULL,             -- tools-registry slug. API allowlist로 검증.
  name       TEXT    NOT NULL,             -- 익명 표시 이름 (1~12자, 서버 sanitize).
  score      INTEGER NOT NULL,             -- 게임 점수 (현재 = kills).
  created_at INTEGER NOT NULL,             -- epoch ms.
  ip_hash    TEXT    NOT NULL              -- SHA-256(IP) — rate-limit 전용 (익명, 원문 저장 X).
);

-- 상위 N 조회: tool_slug 필터 + score DESC, 동점 created_at ASC — ORDER BY 전체를 인덱스가 커버.
CREATE INDEX IF NOT EXISTS idx_game_scores_slug_score ON game_scores (tool_slug, score DESC, created_at ASC);
-- rate-limit 조회: ip_hash + tool_slug(게임별 스코프) + 최근 created_at.
CREATE INDEX IF NOT EXISTS idx_game_scores_ip ON game_scores (ip_hash, tool_slug, created_at DESC);
