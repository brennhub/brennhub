-- saju-naming: hanja 테이블 재생성. C-5-6 (5-way join 적재 선결).
-- 003 대비 변경:
--   - stroke / won_stroke: NOT NULL 제거. 비표준 405자(Unihan 미수록 — plane 10 미할당
--     377 + plane 15 PUA 28)는 필획/원획 산출 불가 → NULL 수용. 003 NOT NULL 충돌 해소
--     (C-5-3 Unihan 추출 / C-5-5 원획법에서 발견).
--   - 그 외 스키마·index 003과 완전 동일.
-- NOT NULL 유지: character / codepoint / hangeul / ohaeng / inname_ok / frequency.
--   (ja_ohaeng / radical / meaning / meaning_en 은 003부터 nullable.)
-- 003 자체 수정 X (이미 dev 반영) → 신규 004로 재생성 (DROP + CREATE, C-5-1 패턴).
-- 적재: 005_hanja_seed_full.sql (9,460 row). migration apply는 Brenn 수동.

DROP TABLE IF EXISTS hanja;

CREATE TABLE hanja (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  character   TEXT    NOT NULL UNIQUE,           -- 한자 (예: 美)
  codepoint   INTEGER NOT NULL UNIQUE,           -- Unicode codepoint (美 = 32654)
  hangeul     TEXT    NOT NULL,                  -- 한글 음 (두음법칙 적용, 예: 美 = '미')
  stroke      INTEGER,                           -- 필획 (Unihan kTotalStrokes). 비표준 405자 NULL.
  won_stroke  INTEGER,                           -- 원획 (작명/한자검정). 비표준 405자 NULL.
  ohaeng      TEXT    NOT NULL,                  -- 음령오행 (한글 자모 → 오행 매핑)
  ja_ohaeng   TEXT,                              -- 자원오행 (부수 → 오행)
  radical     TEXT,                              -- 214 부수 (예: '木')
  meaning     TEXT,                              -- 한국어 의미 (NULL 허용)
  meaning_en  TEXT,                              -- 영어 의미 (NULL 허용)
  inname_ok   INTEGER NOT NULL DEFAULT 1,        -- 인명용 (법적/관습)
  frequency   INTEGER NOT NULL DEFAULT 3         -- 빈도 1~5
);

-- index 5개 (003과 동일)
CREATE INDEX idx_hanja_ohaeng    ON hanja(ohaeng);
CREATE INDEX idx_hanja_stroke    ON hanja(stroke);
CREATE INDEX idx_hanja_hangeul   ON hanja(hangeul);
CREATE INDEX idx_hanja_radical   ON hanja(radical);
CREATE INDEX idx_hanja_ja_ohaeng ON hanja(ja_ohaeng);
