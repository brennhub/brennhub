# 영양제 플래너 Changelog

주요 결정 / 이정표 (Task 단위 요약).

## 2026-05-17
- **MVP 출시** — Cloudflare D1 (`SUPP_DB`) 기반 공유 라이브러리 + localStorage 개인 스케줄. 시간순 뷰 + 호환성 경고 (같은 state ±60분 윈도우). 라이브러리 카드 / 추가 폼 / 시각 뷰.
- **UX 1차 정제** — 상태 taxonomy 7개로 확장 (after-waking, post-workout 추가). TimeStepper 신규 (시/분/AM-PM). 캡슐 NumberStepper. 영양제 SearchableSelect (검색 + 키보드 네비). 표기 통일 (`supplementDisplayName`). 가격/링크 collapsible. 함량 ?툴팁. localStorage v1→v2 마이그레이션 (`meal: null` 추가, `timeEnd` 제거).
- **UX 2차** — 라이브러리 검색 input. 가격 + 통화 (KRW/USD/EUR/JPY). 격일 프리셋 (월수금/화목토). 카드/표 뷰 토글 + ScheduleTable 신규. 영양제 후보 워크플로 — `⚡` Quick-add로 라이브러리에서 즉시 후보 생성 → 확정 버튼으로 스케줄 이동. SCHEMA_VERSION=3, v2→v3 마이그레이션 (entries에 `status: "confirmed"` 부여).
- **폴리시** — 섹션 순서 (내 스케줄 → 후보), 검색 X clear 버튼, 가격 input `type="text" inputMode="decimal"` (브라우저 spinner 제거).
