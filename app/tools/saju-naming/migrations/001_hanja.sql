-- 사주 작명: 한자 풀 (Cloudflare D1).
-- binding: NAMING_DB (예정).

CREATE TABLE IF NOT EXISTS hanja (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  character   TEXT NOT NULL UNIQUE,             -- 한자 (예: 美)
  hangeul     TEXT NOT NULL,                    -- 한글 음 (예: 미)
  stroke      INTEGER NOT NULL,                 -- 획수 (원획법 기준)
  ohaeng      TEXT NOT NULL,                    -- 오행: 목|화|토|금|수
  meaning     TEXT NOT NULL,                    -- 뜻 (예: 아름다울)
  inname_ok   INTEGER NOT NULL DEFAULT 1,       -- 인명용 여부 (1=가능)
  frequency   INTEGER NOT NULL DEFAULT 3        -- 사용 빈도 1~5 (5=많이 씀)
);

CREATE INDEX IF NOT EXISTS idx_hanja_ohaeng  ON hanja(ohaeng);
CREATE INDEX IF NOT EXISTS idx_hanja_stroke  ON hanja(stroke);
CREATE INDEX IF NOT EXISTS idx_hanja_hangeul ON hanja(hangeul);
