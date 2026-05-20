# 라인업 빌더 Changelog

주요 결정 / 이정표.

## [0.4.0] — 2026-05-19

### Added (Task C — feedback 통합)

- **feedback 5단계 통합** (BRENNHUB.md §6 통합 체크리스트, saju-naming 패턴 그대로):
  - `app/api/feedback/route.ts` — `TOOLS` enum에 `"lineup-builder"`.
  - `components/feedback-dialog.tsx` — `FeedbackTool` 타입 유니온 + `toolOptions`에 entry.
  - `components/feedback-button.tsx` — `toolFromPath`에 `/tools/lineup-builder` → `lineup-builder` 매핑.
  - `lib/i18n/messages.ts` — `feedback.toolLineupBuilder` (type + ko "라인업 빌더" / en "Lineup Builder").
  - `app/admin/feedback/page.tsx` — `TOOL_LABEL`에 `"lineup-builder": "라인업 빌더"`.

### Notes

- 빌드 검증: TS 에러 0, 라우트 테이블 변동 없음 (feedback 통합은 라우트 추가 아님).
- 시각 검증(우하단 feedback 버튼 / default tool 선택 / admin 라벨)은 dev 배포 후 사용자 확인.
- 이로써 lineup-builder MVP 통합 체크리스트 완료. 남은 항목은 2단계 확장(localStorage 히스토리 / 평점·스탯 / 테마·유니폼)뿐.

## [0.3.0] — 2026-05-19

### Added (Task B — 인터랙션 + 캡처)

- **드래그** — Pointer Events 통일(`pointerdown/move/up/cancel` + `setPointerCapture`, `touch-action:none`)로 mouse·touch·pen 한 코드 처리. 5px 임계값으로 드래그 vs 클릭 구분. 바운더리는 마커 반지름 % 환산해 clamp.
- **편집 모달** — `edit-dialog.tsx` (feedback-dialog 자체 modal 패턴 재사용: backdrop blur·ESC·backdrop 클릭·취소 3종 닫기). 등번호는 `NumberStepper` 재사용.
- **컨트롤 패널** — `control-panel.tsx` (포메이션 select 활성 + 다운로드 + 초기화). 포메이션 전환 시 players 전체 reset + CSS transition.
- **팀명 + 캡처** — 팀명 input(헤더). `captureRef`는 팀명 헤더 + 핏치를 감싼 카드 div만 대상(컨트롤·모달 제외). dynamic `import("html2canvas")` → `toBlob` → `${팀명}-squad.png` 다운로드. 팀명 빈 값이면 헤더 미렌더.
- **i18n** — `lineupBuilder` 네임스페이스에 팀명/버튼/편집/포메이션명 키 추가. 포메이션 표시명을 데이터(`formations.ts` `label`)에서 i18n `formations` nested로 이동 → `Formation` 타입에서 `label` 제거.

### Changed

- **캡처 호환** — 캡처 대상 subtree(핏치·라인·마커·헤더 카드) 색상을 hex/rgba()로 고정 (Tailwind v4 oklch 토큰·`color-mix` 투명도·CSS 변수 회피 — html2canvas 1.4.1 미파싱). 잔디는 `bg-[#059669] dark:bg-[#065f46]`로 light/dark 두 톤 유지(변수 없이 hex 직접). 화면 = PNG 일치.
- **레이아웃** — Task A의 grid를 `flex md:flex-row` + `order`로 교체 (데스크톱 좌측 컨트롤/우측 핏치, 모바일 팀명→핏치→컨트롤 stack).

### Notes

- 빌드 검증: TS 에러 0, `/tools/lineup-builder` 정적 route emit, prerender HTML에 팀명 input·셀렉트·11 마커·버튼 확인. **드래그/캡처/모달 실동작 시각 검증은 환경 제약으로 미수행 — dev 배포 후 사용자 확인 단계.**
- feedback 통합은 범위 외(Task C). localStorage 히스토리도 2단계 확장.

## [0.2.0] — 2026-05-19

### Added (Task A — 골격 + 정적 렌더링 + registry live)

- **데이터 레이어** — `lib/lineup-builder/types.ts` (`Role` / `FormationId` / `Player` / `Formation`), `lib/lineup-builder/formations.ts` (4종 포메이션 좌표 + `getFormation` + `DEFAULT_FORMATION_ID="4-3-3"`). 경로는 루트 `lib/` (`lib/supp-plan/`과 일관) — README 초기 스케치의 `app/tools/lineup-builder/lib/`와 다름, Task A 지시서 기준.
- **UI 컴포넌트** — `components/lineup-builder/{pitch,player-marker,formation-select}.tsx`. 핏치는 순수 CSS (잔디 stripe + 라인), 외부 이미지 0. 마커 원형 44/48px. formation-select는 Task A에서 disabled(정적).
- **페이지** — `page.tsx` (Server Component shell) + `client-shell.tsx` (`"use client"`, 정적 렌더). 4-3-3 기본 배치 11명 마커.
- **i18n** — `lib/i18n/messages.ts`에 `lineupBuilder` 네임스페이스 (title / description / formationLabel, ko·en).
- **registry live 전환** — `lib/tools-registry.ts` lineup-builder status `"coming-soon"` → `"live"` (page.tsx 생성과 동일 commit).
- **html2canvas** — npm 패키지 설치만. import + 캡처 호출은 Task B (미사용 import는 lint-staged가 제거하므로 dangling import 미생성).

### Notes

- i18n은 이 repo에서 client-side 전용 (`useMessages()` = client hook). 서버 fetch 불가 → page.tsx는 순수 Server shell, 텍스트는 client-shell에서 처리.
- 빌드 검증: `/tools/lineup-builder` 별도 정적 route emit, `[slug]`는 saju-naming만 emit (route collision 없음). 정적 prerender HTML에 11명 마커 확인. 브라우저 시각 검증은 미수행 (환경 제약).

### Next

- Task B: 드래그(mouse+touch) + 마커 클릭 인라인 편집 + 컨트롤 패널 + html2canvas 캡처/다운로드 + feedback 통합.

## [0.1.0] — 2026-05-19

### Added (placeholder 등록 + 도구 폴더 문서 3종)

- **tools-registry 등록** — `lib/tools-registry.ts`에 `lineup-builder` entry (status `"coming-soon"`). commit `f261651`.
- **i18n** — `lib/i18n/messages.ts` `tools` 객체에 `lineup-builder` name / description (ko / en). commit `f261651`.
- **도구 폴더 문서 3종** — `README.md` (도구 개요 + 기술 스택 재설계 + 데이터 구조) + `BACKLOG.md` (MVP 작업 계획 단일 출처) + `CHANGELOG.md` (본 파일).

### Notes

- 외부 기획서 (Bootstrap 5 + Vanilla JS + 단일 index.html)를 brennhub 스택(Tailwind v4 + React Client Component + Next.js App Router + html2canvas npm)으로 재설계 결정.
- 외부 기획서 필터 7개 적용 결과: 가격 / 광고 / 별도 백엔드 모두 미해당. feedback / 도구 폴더 문서는 본 + MVP task 분담.
- 페이지 파일(`page.tsx`) 미생성 — `[slug]` fallback이 자동 처리. MVP task에서 page.tsx 생성과 동시에 status `"live"` 전환.

### Next

- MVP 빌드는 별도 thread에서 진행. `BACKLOG.md` MVP 섹션이 단일 출처. 진입 전 "도메인 결정 필요" 항목 4개 Brenn 확정 선행.
