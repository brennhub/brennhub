-- saju-naming: hanja 테이블 신 스키마. C-5-1 (Task 39-B 임계 경로 첫 단계).
-- 변경 요지:
--   1) 신규 컬럼 5개 추가 (codepoint/won_stroke/ja_ohaeng/radical/meaning_en).
--   2) meaning NOT NULL → NULL 허용 (D안 886자 의미 전무 수용).
--   3) SQLite는 NOT NULL 완화를 ALTER로 지원 X → DROP + CREATE 재생성.
-- 영향:
--   - 002_hanja_seed.sql의 25자는 본 migration apply 시 소실. 9,389자 재적재는 C-5-2 ~ C-5-6에서.
--   - API 영향 X (id 미사용 + 기존 7컬럼 보존).
-- 보류 (C-5-7에서 결정):
--   - recommend route WHERE 재설계 (현재 'inname_ok=1만 → 전 row 메모리 필터' 패턴, 9,389자 적재 후 latency 위험).
--   - 재설계 후 의미 보유 + ohaeng/stroke 등 partial/복합 index 별도 migration 추가.
--   - consonant 컬럼 — 초성 검색 UI 도입 시 ADD COLUMN으로 추가.

DROP TABLE IF EXISTS hanja;

CREATE TABLE hanja (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  character   TEXT    NOT NULL UNIQUE,           -- 한자 (예: 美)
  codepoint   INTEGER NOT NULL UNIQUE,           -- 신규: Unicode codepoint (美 = 32654)
  hangeul     TEXT    NOT NULL,                  -- 한글 음 (두음법칙 적용, 예: 美 = '미')
  stroke      INTEGER NOT NULL,                  -- 필획 (Unihan kTotalStrokes)
  won_stroke  INTEGER NOT NULL,                  -- 신규: 원획 (작명/한자검정)
  ohaeng      TEXT    NOT NULL,                  -- 음령오행 (한글 자모 → 오행 매핑)
  ja_ohaeng   TEXT,                              -- 신규: 자원오행 (부수 → 오행)
  radical     TEXT,                              -- 신규: 214 부수 (예: '木')
  meaning     TEXT,                              -- 한국어 의미 (NULL 허용)
  meaning_en  TEXT,                              -- 신규: 영어 의미 (NULL 허용)
  inname_ok   INTEGER NOT NULL DEFAULT 1,        -- 인명용 (법적/관습)
  frequency   INTEGER NOT NULL DEFAULT 3         -- 빈도 1~5
);

-- 기존 index 3개 유지
CREATE INDEX idx_hanja_ohaeng    ON hanja(ohaeng);
CREATE INDEX idx_hanja_stroke    ON hanja(stroke);
CREATE INDEX idx_hanja_hangeul   ON hanja(hangeul);

-- 신규 index 2개 (검색/필터 가속)
CREATE INDEX idx_hanja_radical   ON hanja(radical);
CREATE INDEX idx_hanja_ja_ohaeng ON hanja(ja_ohaeng);
