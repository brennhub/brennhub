# 언어 창조기 Changelog

주요 결정 / 이정표.

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
