# 언어 창조기 Changelog

주요 결정 / 이정표.

## [0.2.0] — 2026-05-21

### Added (V1 MVP — coming-soon → live)

- **코어 로직** — `lib/language-maker/`: `types.ts`(16×16 글리프 · `LanguageProject`) + `storage.ts`(localStorage hydrate/persist/schemaVersion 마이그레이션) + `glyph.ts`(canvas 렌더 헬퍼 · longest-match 토큰화).
- **페이지** — `app/tools/language-maker/{page,client-shell}.tsx` — Server shell + client. 스텝 1 슬롯·매핑 → 2 픽셀 에디터 → 3 바벨 타자기.
- **UI 컴포넌트** — `components/language-maker/`: `step-nav` · `glyph-canvas`(읽기 전용 비트맵 canvas) · `slot-panel`(무지 슬롯 + 1:1 트리거 매핑) · `pixel-editor`(16×16 canvas 드로잉) · `typewriter`(실시간 변환 + PNG 저장).
- **registry live 전환** — `tools-registry.ts` status `coming-soon` → `live` (page.tsx 생성과 동일 commit).
- **i18n** — `languageMaker.*` namespace (ko/en) + `feedback.toolLanguageMaker`.
- **feedback 통합** — `FeedbackTool` 타입 / `feedback-button` pathname 매핑 / `feedback-dialog` toolOptions / `api/feedback` TOOLS enum / admin `TOOL_LABEL` (BRENNHUB.md §6 통합 체크리스트 5단계).
- **TOOLS.md** 도구 인덱스 등재.

### Decided

- **캡처/렌더 = canvas 네이티브 (`toDataURL`)** — 외부 캡처 라이브러리 0. 픽셀 에디터·바벨 타자기 모두 `<canvas>` 직접 렌더 → CSS 파싱 단계 부재로 lineup-builder가 겪은 빈 PNG 이슈 구조적 회피.
- **다크모드 = `useTheme()` 구독** — 기존 `theme-provider` 재사용 (MutationObserver 미사용). PATTERNS.md 기존 패턴 재사용 원칙.
- 픽셀 그리드 16×16 고정 / V1 단일 언어(글리프 컬렉션 1개) / 타자기 토큰화 longest-match(단어 트리거 우선) / 미매핑 글자 = 회색 원문 통과.
- PNG 파일명 = `language-maker-<YYYY-MM-DD>.png` (stock-sim CSV `<slug>-<date>` 컨벤션 일관).

### Notes

- 빌드: `/tools/language-maker`가 별도 정적 route로 prerender — `[slug]` fallback 아님, route collision 없음.
- V2 후보(스타터 팩 프리셋 · 랜덤 대칭 생성기)는 BACKLOG.md 참조.

## [0.1.0] — 2026-05-21

### Added (placeholder 등록 + 도구 폴더 문서 3종)

- **tools-registry 등록** — `lib/tools-registry.ts`에 `language-maker` entry (status `"coming-soon"`).
- **i18n** — `lib/i18n/messages.ts` `tools` 객체에 `language-maker` name / description (ko / en).
- **도구 폴더 문서 3종** — `README.md` (도구 개요 + V1 코어 스코프 + 기술 스택 + 데이터 구조) + `BACKLOG.md` (V1 MVP 작업 계획 단일 출처) + `CHANGELOG.md` (본 파일).

### Decided

- **캡처 방식 = canvas 네이티브 (`canvas.toDataURL`)** — 외부 캡처 라이브러리 미사용. 기획서 명세(html2canvas)는 lineup-builder가 동일 Tailwind v4 + Lightning CSS 환경에서 빈 PNG 버그로 `modern-screenshot`으로 교체한 이력(lineup-builder CHANGELOG 0.5.0)이 있어 제외. 픽셀 글리프는 `<canvas>` 직접 렌더가 본령 — CSS 파싱 단계가 없어 해당 버그가 구조적으로 발생 불가. 렌더 방식 확정은 MVP task로 위임.

### Notes

- 외부 기획서 필터 7개 적용 결과: 가격/결제 UI · 광고 슬롯 · 별도 백엔드 모두 미해당 (클라이언트 + localStorage 완결).
- 페이지 파일(`page.tsx`) 미생성 — `[slug]` fallback이 자동 처리. MVP task에서 page.tsx 생성과 동시에 status `"live"` 전환.
- V1 스코프 의도적 축소 — 스타터 팩·랜덤 대칭 생성기는 V2 후보.

### Next

- MVP 빌드는 별도 task. `BACKLOG.md` V1 MVP 섹션이 단일 출처.
