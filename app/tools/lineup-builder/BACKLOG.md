# 라인업 빌더 Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동. 본 문서는 MVP task의 **단일 출처**.

## MVP (1단계 — status "coming-soon" → "live" 전환까지)

### 인프라

- [ ] `html2canvas` npm 패키지 설치 (v1.4.1 또는 최신 stable)
- [ ] 페이지 파일 생성: `app/tools/lineup-builder/page.tsx` (Server Component shell, client-shell 패턴)
- [ ] Client wrapper: `app/tools/lineup-builder/client-shell.tsx` (`"use client"`, 모든 인터랙션·캡처 진입점)
- [ ] tools-registry status `"coming-soon"` → `"live"` 전환 (page.tsx 생성과 같은 commit. README.md:48-54 route collision 표 준수 — placeholder는 [slug] fallback이라 live 전환 시 정적 페이지가 우선)

### 데이터

- [ ] `app/tools/lineup-builder/lib/formations.ts` — 포메이션 4종 좌표
  - 4-4-2 (외부 기획서 § 4.1 transcribe)
  - 4-3-3 (외부 기획서 § 4.1 transcribe)
  - 3-5-2 (도메인 정찰 후 결정)
  - 4-2-3-1 (도메인 정찰 후 결정)
- [ ] `Player` / `Formation` 타입 정의 (README "데이터 구조" 섹션 참조)

### UI 컴포넌트

- [ ] 경기장 컴포넌트 (`components/pitch.tsx`) — aspect-ratio 3/4, Tailwind, 잔디 패턴 + 라인 (순수 CSS)
- [ ] 선수 마커 (`components/player-marker.tsx`) — absolute + `translate -50%`, 원형, 등번호 + 이름
- [ ] 포메이션 선택 (`components/formation-select.tsx`) — 좌측 패널
- [ ] 인라인 편집 UI (`components/edit-dialog.tsx`) — 마커 클릭 → 모달 또는 우측 패널 폼 (이름 + 등번호)
- [ ] 컨트롤 패널 — 포메이션 선택 + 다운로드 + 초기화 버튼
- [ ] 반응형 레이아웃 — 데스크톱: 분할 (Tailwind grid). 모바일: 스택.

### 인터랙션

- [ ] 드래그 — mouse(`mousedown` / `mousemove` / `mouseup`) + touch(`touchstart` / `touchmove` / `touchend`)
- [ ] 바운더리 체크 — 경기장 안에서만 이동 (마커 반지름 고려)
- [ ] 포메이션 변경 transition — CSS `transition` for `top` / `left`
- [ ] 마커 클릭 → 인라인 편집 (이름 + 등번호)

### 이미지 캡처

- [ ] html2canvas 통합 (npm import, default export 패턴 — BRENNHUB.md § 7 OpenNext 컨벤션 무관, 클라이언트 사이드 only)
- [ ] 경기장 영역 PNG 캡처 → `brennhub-squad.png` 다운로드 트리거
- [ ] 캡처 시 외부 이미지 로딩 의존성 제거 (모든 그래픽 순수 CSS — CORS 회피 + 캡처 안정성)

### feedback 통합 (필수 — BRENNHUB.md § 6 통합 체크리스트)

- [ ] `app/api/feedback/route.ts` TOOLS enum에 `"lineup-builder"` 추가
- [ ] `components/feedback-dialog.tsx` toolOptions에 lineup-builder 추가
- [ ] `components/feedback-button.tsx` pathname 매핑에 추가 (`/tools/lineup-builder` → defaultTool)
- [ ] `lib/i18n/messages.ts` `feedback.toolLineupBuilder` ko/en 추가
- [ ] `app/admin/feedback` 라벨 매핑 추가

### 검증

- [ ] PoC 또는 수동 검증 케이스 — 포메이션 4종 좌표 적용 + 드래그 동작 + 캡처
- [ ] dev 배포 후 수동 테스트 — 포메이션 변경 + 드래그 + 다운로드 (Windows / iOS / Android 각 1회)

## 2단계 확장 (MVP 검증 후 별도 task)

- [ ] **6.1 localStorage 스쿼드 히스토리** — `PersonalScheduleStorage` 패턴 일관 (supp-plan `lib/supp-plan/storage/types.ts` 참고). interface + impl 분리로 미래 D1 마이그레이션 대비.
- [ ] **6.2 평점 / 스탯 오버레이** — Rating, 골 / 어시스트 아이콘. 선수당 메타데이터 확장.
- [ ] **6.3 테마 + 유니폼 커스텀** — 잔디 색 / 라인 색 / 마커 색 변경. 다크모드 호환.

## 도메인 결정 필요 (MVP 진입 전 Brenn 확정 항목)

- 3-5-2 좌표 — 11명 위치 백분율 (top, left)
- 4-2-3-1 좌표 — 11명 위치 백분율 (top, left)
- 캡처 시 팀 명칭 표시 위치 — 경기장 위(헤더) vs 아래(푸터) vs 미표시
- 인라인 편집 UX — 모달 vs 우측 패널 폼 (모바일 UX 고려)

## 출처

- 외부 기획서 § 1-6 (Brenn 수령, 2026-05-19) + brennhub 외부 기획서 필터 7개 적용 결과.
- 등록 commit: `f261651 feat(lineup-builder): add coming-soon placeholder`.
