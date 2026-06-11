# 타로 테이블 (Tarot Table) CHANGELOG

## 0.1.0 — Task 1: 스캐폴드 + 카드 사전 데이터 + 카드 컴포넌트 v1 (2026-06-10)

**What** — 도구 기반 작업: 레지스트리 등록(live, lifestyle) · S0 입구 골격 · 사전 v0.3 → typed const 이관 · i18n(ko/en) · 피드백 통합 · 카드 컴포넌트 v1. 의식 플로우 S1~S8은 Task 2/3.

**Why** — 결정론 타로의 신뢰축은 "변하지 않는 사전" — 데이터 레이어를 가장 먼저 동결·검증해야 이후 플로우(Task 2)와 리딩(Task 3)이 그 위에 선다.

**Where**
- `lib/tarot/{types,cards,glyphs}.ts` — §6.1 스키마 / 생성된 22장 / 로마자·점성 글리프
- `app/tools/tarot/scripts/gen-cards.mjs` — DICTIONARY.md 파서 + assert(22장·44방향·키워드 222·도메인 enum·수비학==id) + `--force` 덮어쓰기 가드
- `app/tools/tarot/{page,client-shell}.tsx` + `components/tarot-card.tsx` — S0 + 카드 v1(CSS 타이포 앞면 / 사선 격자 뒷면, foreground 토큰으로 양 테마 자동)
- 등록처: tools-registry / hub ICON_BY_SLUG(MoonStar) / messages.ts(tarot ns + tools.tarot + feedback.toolTarot) / feedback dialog·api·admin / TOOLS.md

**결정 기록**
- 카테고리 lifestyle — saju-naming과 "결정론 운세 클러스터" 인접 배치 (기획 §2).
- 변환 스크립트 **보존** — tag-it 선례 + "출처 있는 사전"의 감사 추적 + v2 마이너 아르카나 파이프라인. 유실 위험은 `--force` 가드로 차단.
- 원소 글리프는 연금술 유니코드(U+1F70x) 회피 → CSS 삼각형 (모바일 tofu 방지). 황도 12궁은 VS15로 텍스트 표현 강제.
- `?debug=1` 덱 프리뷰 — 편집장 dev 검수용 쿼리 게이트 (tag-it 0.8.9 선례). S5~S7 구현 시 제거 가능.

**Verify** — `npm run build`에서 `/tools/tarot` 별도 row · gen-cards.mjs assert 전체 그린 · 기획 §6.2 기준 카드(힘·죽음) spot-diff 일치 · mute 조합 9건 로그.
