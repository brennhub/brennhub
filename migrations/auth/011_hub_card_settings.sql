-- brennhub: Hub 카드 전역 설정 (Hub Customization, 2026-06-02).
-- singleton row (id=1). description_lines / padding_bottom 전역 적용.
-- CHECK (id = 1)로 다중 row 차단. INSERT OR IGNORE 패턴으로 seed.
-- 적용: thread 위임.

CREATE TABLE IF NOT EXISTS hub_card_settings (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  description_lines INTEGER NOT NULL DEFAULT 3,   -- line-clamp N (2..6 권장 범위)
  padding_bottom    INTEGER NOT NULL DEFAULT 40,  -- px, absolute 요소 buffer
  updated_at        INTEGER NOT NULL
);

-- 초기 row seed (UPSERT 패턴이지만 단일 row라 INSERT OR IGNORE으로 충분)
INSERT OR IGNORE INTO hub_card_settings (id, description_lines, padding_bottom, updated_at)
VALUES (1, 3, 40, 0);
