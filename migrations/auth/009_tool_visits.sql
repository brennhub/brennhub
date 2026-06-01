-- brennhub: 도구별 익명 방문 일별 집계 (Hub Visits Phase 2, 2026-06-02).
-- AUTH_DB(brennhub-auth) 도메인 확장 — 별도 DB 미생성 정책 일관.
-- 익명 집계 — user 추적 X. 클라이언트 sessionStorage로 1회 dedup.
-- 일별 row로 압축 (raw event 무한 누적 회피). count INSERT OR REPLACE 증분.
-- IF NOT EXISTS 멱등성.
-- 적용: Brenn 또는 thread 위임.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/009_tool_visits.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/009_tool_visits.sql`
-- 잠금 위험 0 (ADD TABLE).

CREATE TABLE IF NOT EXISTS tool_visits (
  tool_slug TEXT    NOT NULL,             -- tools-registry slug. API allowlist로 검증.
  date      TEXT    NOT NULL,             -- YYYY-MM-DD (UTC).
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tool_slug, date)
);

CREATE INDEX IF NOT EXISTS idx_tool_visits_slug ON tool_visits (tool_slug);
