-- brennhub: 도구 텍스트 admin override (Hub Customization, 2026-06-02).
-- 파일 lib/i18n/messages.ts의 tools.<slug> = 소스, D1 = admin 오버레이.
-- NULL 컬럼 = 파일 default 사용. admin이 비우면 자동 복귀.
-- IF NOT EXISTS 멱등성. 적용: thread 위임.
--   prod    : `wrangler d1 execute brennhub-auth     --remote --file=migrations/auth/010_tool_overrides.sql`
--   preview : `wrangler d1 execute brennhub-auth-dev --remote --file=migrations/auth/010_tool_overrides.sql`

CREATE TABLE IF NOT EXISTS tool_overrides (
  tool_slug   TEXT    NOT NULL,           -- tools-registry slug
  locale      TEXT    NOT NULL,           -- 'ko' | 'en'
  name        TEXT,                        -- NULL = 파일 default 사용
  description TEXT,                        -- 동일
  updated_at  INTEGER NOT NULL,
  PRIMARY KEY (tool_slug, locale)
);
