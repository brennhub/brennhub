-- brennhub: 도구별 사용자 데이터 (Phase 2-1, 2026-05-27).
-- AUTH_DB(brennhub-auth) 도메인 확장 — 별도 DB 미생성 정책 일관.
-- 한 사용자가 도구당 단일 JSON 문서 보유 (whole-document read/write 패턴).
-- 도구 데이터 shape은 application-level (data 컬럼 = JSON.stringify).
-- schemaVersion 등 메타는 JSON 안에서 도구가 자체 관리.
-- 적용: Brenn 수동.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/005_user_data.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/005_user_data.sql`
--   (`--env preview` flag는 D1을 안 바꿈 — DB 이름 첫 인자 직접 지정 필수.)
-- 잠금 위험 0 (ADD TABLE, 권한 변경 X). main 머지 시 코드 경로 미연결 (도구 사용은 2-2 부터).

CREATE TABLE IF NOT EXISTS user_data (
  user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool       TEXT    NOT NULL,             -- tools-registry slug ('supp-plan' 등). API allowlist로 검증.
  data       TEXT    NOT NULL,             -- JSON document (도구 내부 shape + schemaVersion 포함).
  updated_at INTEGER NOT NULL,              -- unix epoch ms (마지막 PUT 시점).
  PRIMARY KEY (user_id, tool)
);
