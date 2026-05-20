# 라인업 빌더 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동. 본 문서는 MVP task의 **단일 출처**.

## MVP (1단계 — status "coming-soon" → "live" 전환까지)

### 인프라

- [x] `html2canvas` npm 패키지 설치 (Task A — 설치만. import + 캡처 호출은 Task B)
- [x] 페이지 파일 생성: `app/tools/lineup-builder/page.tsx` (Server Component shell, client-shell 패턴)
- [x] Client wrapper: `app/tools/lineup-builder/client-shell.tsx` (`"use client"`. Task A는 정적 렌더만, 인터랙션 진입점은 Task B)
- [x] tools-registry status `"coming-soon"` → `"live"` 전환 (page.tsx 생성과 동일 commit. route collision 없음 — 빌드 출력에서 `/tools/lineup-builder`가 별도 정적 route로 emit 확인)

### 데이터

- [x] `lib/lineup-builder/formations.ts` — 포메이션 4종 좌표 (경로: 루트 `lib/`, `lib/supp-plan/`과 일관. 4종 좌표 모두 Task A 지시서에서 확정 수령)
  - 4-4-2 / 4-3-3 / 3-5-2 / 4-2-3-1 — `mkPlayer` 헬퍼로 name `선수 N` / number N 자동 채움
- [x] `lib/lineup-builder/types.ts` — `Role` / `FormationId` / `Player` / `Formation` 타입

### UI 컴포넌트

- [x] 경기장 컴포넌트 (`components/lineup-builder/pitch.tsx`) — aspect-ratio 3/4, 잔디 stripe + 라인 (외곽선/하프라인/센터서클/페널티·골 박스), 순수 CSS
- [x] 선수 마커 (`components/lineup-builder/player-marker.tsx`) — absolute + `translate -50%`, 원형 44/48px, 등번호 굵게 + 이름 (잔디 위 가독성 위해 반투명 배경)
- [x] 포메이션 선택 (`components/lineup-builder/formation-select.tsx`) — 좌측 패널. Task A는 정적(`onChange` 미전달 → disabled), 선택 핸들러는 Task B
- [x] 인라인 편집 UI (`components/lineup-builder/edit-dialog.tsx`) — 마커 클릭 → 모달 (이름 + 등번호 NumberStepper). feedback-dialog 자체 modal 패턴 재사용
- [x] 컨트롤 패널 (`components/lineup-builder/control-panel.tsx`) — 포메이션 select + 다운로드 + 초기화
- [x] 반응형 레이아웃 — 데스크톱: `flex md:flex-row` + `order` (좌측 컨트롤 / 우측 핏치). 모바일: 팀명 input → 핏치 → 컨트롤 stack.

### 인터랙션

- [x] 드래그 — Pointer Events 통일 (`pointerdown/move/up/cancel`, `setPointerCapture`) — mouse·touch·pen 한 코드
- [x] 바운더리 체크 — 마커 반지름(circle offsetWidth/2)을 % 환산해 top/left clamp
- [x] 포메이션 변경 transition — 평시 `transition-[left,top] duration-300`, 드래그 중 `transition-none`
- [x] 마커 클릭 → 인라인 편집 — pointerdown 후 5px 미만 이동 시 클릭으로 판정

### 이미지 캡처

- [x] html2canvas 통합 — dynamic `import("html2canvas")` (초기 번들 제외), default export
- [x] 캡처 영역 PNG → `${팀명}-squad.png` (팀명 없으면 `brennhub-squad.png`, sanitize). `URL.createObjectURL` + `<a download>`
- [x] 캡처 안정성 — 외부 이미지/폰트 0. 캡처 subtree 색상은 hex/rgba()만 (oklch·color-mix·CSS변수 회피)

### feedback 통합 (필수 — BRENNHUB.md § 6 통합 체크리스트)

- [x] `app/api/feedback/route.ts` TOOLS enum에 `"lineup-builder"` 추가
- [x] `components/feedback-dialog.tsx` `FeedbackTool` 타입 + toolOptions에 lineup-builder 추가
- [x] `components/feedback-button.tsx` pathname 매핑에 추가 (`/tools/lineup-builder` → defaultTool)
- [x] `lib/i18n/messages.ts` `feedback.toolLineupBuilder` ko/en 추가
- [x] `app/admin/feedback` `TOOL_LABEL` 매핑 추가

### 검증

- [x] 빌드 검증 — `npm run build` TS 에러 0, `/tools/lineup-builder` 정적 route emit, prerender HTML에 인터랙티브 요소 확인
- [ ] dev 배포 후 수동 테스트 — 드래그 + 편집 모달 + 포메이션 전환 + PNG 다운로드 (Windows / iOS / Android 각 1회). 브라우저 시각 검증은 이 단계에서 수행

## Task D — 수정·확장 (완료)

- [x] **PNG 캡처 fix** — html2canvas 1.4.1이 Tailwind v4 + Lightning CSS의 `lab/oklab/color-mix`(globals.css base 레이어가 전 노드에 주입) 미파싱 → 빈 PNG. `modern-screenshot`(foreignObject, 브라우저 네이티브 렌더)로 교체. `handleDownload`에 `catch` 추가.
- [x] **팀 색상** — 컨트롤 패널에 8색 swatch (`color-swatches.tsx`). 마커 원형/이름 배경에 적용, 텍스트·테두리는 `getContrastText`(WCAG 휘도) 자동 대비. 기본 `#1e40af`.
- [x] **포메이션 4종 추가** — 4-1-4-1 / 3-4-3 / 5-3-2 / 4-3-2-1 (총 8종). `FormationId` 유니온 확장, 기본은 `4-3-3` 유지.
- [x] **등번호 단일 꺽쇠** — EditDialog NumberStepper에 기존 `showBigStep={false}` prop 적용 (공유 컴포넌트 수정 0).
- [x] **서비스 제목 변경** — "축구 베스트 일레븐 만들기" / "Football Best XI Builder" (식별자 불변, UI 문자열만).

## Task E — 세부 포지션 + 감독 + 주장 (완료)

- [x] **세부 포지션 15종** — `PositionCode` 유니온 + `Player.position` (Role 4종과 공존). `mkPlayer(id, role, position, top, left)`로 8포메이션 88명 매핑. 마커에 등번호 위 작은 글씨로 포지션 코드 표시.
- [x] **마커 크기 48/52px** — 포지션 + 등번호 2단 적재 공간 확보 (Task A 원안 44px+/48~52px 범위 내).
- [x] **편집 모달 확장** — 포지션 select(15옵션) + 주장 토글(공유 `Switch` 재사용).
- [x] **감독 입력** — 팀명과 2칸 grid. 캡처 헤더 4케이스 분기(`capture-header.tsx`). 다운로드 파일명은 팀명 기준 유지.
- [x] **주장 선택** — `captainId` state(배타적 1명), 마커 우상단 노랑 "C" 배지. 포메이션 변경 시 유지, 초기화 시 해제.
- [x] **i18n** — `positionLabel` / `managerLabel` / `managerPlaceholder` / `captainToggle` (ko/en).

## Task F — 빠른 수정 (완료)

- [x] **다크모드 포지션 select fix** — `edit-dialog.tsx`의 포지션 select가 투명 배경(`bg-transparent`)이라 다크모드 option 팝업이 흰 배경+흰 글자로 안 보임. 앱 전체 표준인 불투명 패턴(`formation-select.tsx`와 동일 className: `bg-white dark:bg-zinc-900` + `text-zinc-900 dark:text-zinc-100`)으로 교체.
- [x] **핏치 간격 압축** — `top' = round((top-50)*0.85+50)`로 8포메이션 88명 top 직접 갱신. GK 92→86 등 위아래 마진 확보, 라인 비율 유지. left 불변.
- [x] **핏치 내 포메이션 라벨** — 핏치 우상단(`top-2 right-2`)에 raw FormationId 표시. 반투명 검정 박스 + 흰 글자(inline rgba/hex), captureRef 안이라 PNG 자동 반영.

## 2단계 확장 (MVP 검증 후 별도 task)

- [ ] **6.1 localStorage 스쿼드 히스토리** — `PersonalScheduleStorage` 패턴 일관 (supp-plan `lib/supp-plan/storage/types.ts` 참고). interface + impl 분리로 미래 D1 마이그레이션 대비.
- [ ] **6.2 평점 / 스탯 오버레이** — Rating, 골 / 어시스트 아이콘. 선수당 메타데이터 확장.
- [ ] **6.3 테마 + 유니폼 커스텀** — 잔디 색 / 라인 색 / 마커 색 변경. 다크모드 호환.
- [ ] **6.4 freeform 포지션 + 자동 포메이션 추정 (FM/FIFA식)** — 고정 포메이션 좌표 대신 자유 배치 + 배치로부터 포메이션 자동 추정. 데이터 모델 리팩토링 필요. MVP 효능감 검증 후 진행 결정.

## 도메인 결정 (해결 완료)

- 3-5-2 / 4-2-3-1 좌표 — Task A 지시서에서 확정 수령, transcribe 완료.
- 캡처 시 팀 명칭 표시 위치 — **경기장 위 헤더** (팀명 빈 값이면 헤더 미렌더 → 캡처에서도 제외).
- 인라인 편집 UX — **중앙 모달** (자체 modal 패턴). 모바일에선 `w-full max-w-sm`로 화면 거의 가득.

## 출처

- 외부 기획서 § 1-6 (Brenn 수령, 2026-05-19) + brennhub 외부 기획서 필터 7개 적용 결과.
- 등록 commit: `f261651 feat(lineup-builder): add coming-soon placeholder`.
