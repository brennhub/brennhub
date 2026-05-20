# 라인업 빌더 Changelog

주요 결정 / 이정표.

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
