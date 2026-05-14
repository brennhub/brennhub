# Backlog

이 파일은 "지금은 안 하기로 결정했지만 미래에 다시 볼 가치가 있는 아이디어"를 모으는 곳.
완료된 항목은 별도 섹션 또는 git log로 추적.

## Cross-cutting (인프라/패턴)

- **Pretendard: next/font/local + 자체호스팅 woff2로 마이그레이션 검토** — CDN `@import`는 render-blocking이라 트래픽 의미 있게 늘면 LCP 개선용으로 도입.

## 도구별

### email-diag

- **Locale 토글 시 분석 재생성 + 캐시 (A+D 조합)**
  - 현재 동작: 결과 화면에서 locale 토글하면 정적 UI는 즉시 바뀌지만 이미 생성된 AI 분석(Verdict)은 원래 언어로 남음.
  - 개선안 A: locale 변경 시 같은 도메인 자동 재진단해서 새 언어 분석 받기.
  - 개선안 D: 한 번 받은 언어는 클라이언트 메모리에 캐시 → 재방문 시 즉시 표시.
  - 트레이드오프: A는 토글 시 1회 추가 API 호출 (Workers AI 무료 한도 내). D는 코드 복잡도 약간 증가 (메모리 캐시 hook).
  - 재사용성: 미래 모든 AI 출력 도구에 동일한 패턴 적용 가능 → `useLocaleAwareResult` hook으로 만들면 factory 자산.
  - 결정 보류 사유: MVP 수준에선 현재 동작도 수용 가능. 실제 사용자의 토글 패턴 데이터 본 후 결정.
