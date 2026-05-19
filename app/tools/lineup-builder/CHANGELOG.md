# 라인업 빌더 Changelog

주요 결정 / 이정표.

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
