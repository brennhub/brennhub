# 라인업 빌더 Changelog

주요 결정 / 이정표.

## [0.6.1] — 2026-05-19

### Fixed

- **다크모드 포지션 select 가독성** — 편집 모달의 포지션 select가 `bg-transparent`라 다크모드에서 native `<option>` 팝업이 흰 배경 + (상속된) 흰 글자로 안 보였음. 앱 전체 다른 select가 모두 쓰는 불투명 패턴(`formation-select.tsx`와 동일: `bg-white dark:bg-zinc-900` + `text-zinc-900 dark:text-zinc-100`)으로 교체.

### Changed

- **핏치 간격 압축** — `formations.ts` 8포메이션 88명의 top을 `round((top-50)*0.85+50)`로 직접 갱신. GK(92→86) 하단 잘림 해소 + 위아래 마진 확보, 라인 간 비율 유지. left% 불변.

### Added

- **핏치 내 포메이션 라벨** — 핏치 우상단에 현재 FormationId(raw, 예 "4-3-3") 표시. 반투명 검정 박스 + 흰 글자(inline rgba/hex). `pitch.tsx`에 `formationId` prop 추가, captureRef 안이라 PNG에도 자동 반영.

### Notes

- 빌드 검증: TS 에러 0, 라우트 변동 없음. 시각 검증(다크 select, GK 잘림 해소, 8포메이션 라벨, PNG 라벨 포함)은 dev 배포 후 사용자 확인.

## [0.6.0] — 2026-05-19

### Added (Task E — 세부 포지션 + 감독 + 주장)

- **세부 포지션 15종** — `PositionCode` 유니온(`lib/lineup-builder/types.ts`) + `Player.position`. **Role 4종(GK/DF/MF/FW)은 색·그룹용으로 그대로 유지** — Position과 공존. `mkPlayer` 시그니처에 position 추가, 8포메이션 88명 매핑. 마커는 등번호 위에 포지션 코드(영어 약어, i18n 불필요)를 작게 표시.
- **마커 크기 48/52px** — 포지션 + 등번호 2단 적재를 위해 44/48 → 48/52px 소폭 확대 (Task A 원안 범위 내).
- **편집 모달** — 포지션 select(15) + 주장 지정 토글(공유 `Switch` 재사용). 변경은 저장 시 커밋.
- **감독 입력** — 팀명 input과 2칸 grid. 캡처 헤더는 4케이스 분기(`capture-header.tsx`): 둘 다 빈값/팀명만/감독만/둘 다. 다운로드 파일명은 팀명 기준 유지.
- **주장** — `captainId` state(배타적 1명만). 마커 우상단 노랑(`#eab308`) "C" 배지. 포메이션 변경 시 유지, 초기화 시 해제.
- **i18n** — `lineupBuilder`에 `positionLabel` / `managerLabel`(헤더 "감독:" 접두 겸용) / `managerPlaceholder` / `captainToggle` (ko/en).

### Notes

- 빌드 검증: TS 에러 0, 라우트 변동 없음. 시각 검증(마커 빽빽함, 8포메이션 포지션 매핑, 편집 모달 포지션·주장 배타, 감독 헤더+PNG, C 배지 라이트/다크)은 dev 배포 후 사용자 확인.

## [0.5.0] — 2026-05-19

### Fixed

- **PNG 캡처 빈 이미지 fix** — html2canvas 1.4.1은 `rgb/rgba/hsl/hsla`만 파싱. 이 repo는 Tailwind v4 + Lightning CSS가 색을 `lab()`·`oklab`·`color-mix()`로 컴파일하고, `globals.css`의 `@layer base { * { @apply border-border outline-ring/50 } }`가 **모든 노드**에 `border-color`/`outline-color`로 모던 색 함수를 주입 → html2canvas가 캡처 트리 전 노드에서 파싱 실패 → 빈 PNG. **`html2canvas` 제거, `modern-screenshot` 도입** (foreignObject 방식 = 브라우저 네이티브 렌더 → 모든 모던 CSS 지원). `handleDownload`에 `catch` 추가로 향후 실패 가시화.

### Added

- **팀 색상** — 컨트롤 패널 8색 swatch (`components/lineup-builder/color-swatches.tsx`, 빨/파/검/흰/노/초/주/보). `teamColor` state(기본 `#1e40af`). 마커 원형·이름 배경에 적용, 번호·이름·테두리는 `lib/lineup-builder/color.ts`의 `getContrastText`(WCAG 상대휘도 0.179 임계)로 자동 대비. 캡처 PNG에도 반영(inline style).
- **포메이션 4종 추가 (총 8종)** — 4-1-4-1 / 3-4-3 / 5-3-2 / 4-3-2-1. `FormationId` 유니온 + `FORMATIONS` 확장, 기본 포메이션 `4-3-3` 유지. i18n `lineupBuilder.formations`에 4키 (ko/en).
- **i18n** — `lineupBuilder.teamColorLabel` (ko/en).

### Changed

- **등번호 단일 꺽쇠** — EditDialog의 NumberStepper에 기존 `showBigStep={false}` prop 적용. 공유 컴포넌트(`number-stepper.tsx`) 수정 0 → 타 도구 영향 없음.
- **서비스 제목 변경** — UI 표시명 "라인업 빌더" → **"축구 베스트 일레븐 만들기"** (en "Lineup Builder" → "Football Best XI Builder"). 변경 위치: `messages.ts`의 `tools["lineup-builder"].name` / `lineupBuilder.title` / `feedback.toolLineupBuilder`, `admin/feedback`의 `TOOL_LABEL`, README 제목. 코드 식별자(slug/registry id/경로) 불변.

### Notes

- 빌드 검증: TS 에러 0, 라우트 변동 없음. 시각 검증(PNG 라이트/다크, 색 8종 대비, 8 포메이션, 단일 꺽쇠, 제목 반영)은 dev 배포 후 사용자 확인.
- BACKLOG 2단계 확장에 "6.4 freeform 포지션 + 자동 포메이션 추정" 후보 등록.

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
