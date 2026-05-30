# Backlog

"지금은 안 하기로 결정했지만 미래에 다시 볼 가치가 있는 아이디어" 인덱스.
완료된 항목은 별도 섹션 또는 git log로 추적.

## 도구별

- [email-diag](app/tools/email-diag/BACKLOG.md)
- [cron-trans](app/tools/cron-trans/BACKLOG.md)
- [stock-sim](app/tools/stock-sim/BACKLOG.md)
- [supp-plan](app/tools/supp-plan/BACKLOG.md)
- [tag-it](app/tools/tag-it/BACKLOG.md)

## 전역 (도구 무관 / 인프라)

- **Pretendard: next/font/local + 자체호스팅 woff2로 마이그레이션 검토** — CDN `@import`는 render-blocking이라 트래픽 의미 있게 늘면 LCP 개선용으로 도입.
- **도구 즐겨찾기 기능 (로그인/유저 관리 시스템 도입 시)** — 사용자별 즐겨찾기 도구 저장, 대시보드 상단 노출.
- **ESLint 경고 정리 (시간 날 때 점진적)** — `react-hooks/set-state-in-effect` 패턴 리팩토링: NumberStepper warning fade-out, lib/i18n/provider.tsx locale 로드, dca-down-calculator localStorage 동기화 등. 누락 useEffect deps 검토. 현재 error → warn 다운그레이드 상태. 정리 완료 시 다시 error로 복귀 검토.
