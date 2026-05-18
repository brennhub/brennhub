# Backlog

이 파일은 "지금은 안 하기로 결정했지만 미래에 다시 볼 가치가 있는 아이디어"를 모으는 곳.
완료된 항목은 별도 섹션 또는 git log로 추적.

## Cross-cutting (인프라/패턴)

- **Pretendard: next/font/local + 자체호스팅 woff2로 마이그레이션 검토** — CDN `@import`는 render-blocking이라 트래픽 의미 있게 늘면 LCP 개선용으로 도입.
- **도구 즐겨찾기 기능 (로그인/유저 관리 시스템 도입 시)** — 사용자별 즐겨찾기 도구 저장, 대시보드 상단 노출.
- **ESLint 경고 정리 (시간 날 때 점진적)** — `react-hooks/set-state-in-effect` 패턴 리팩토링: NumberStepper warning fade-out, lib/i18n/provider.tsx locale 로드, dca-down-calculator localStorage 동기화 등. 누락 useEffect deps 검토. 현재 error → warn 다운그레이드 상태. 정리 완료 시 다시 error로 복귀 검토.

## 도구별

### supp-plan

- **사진 업로드 (성분표 등)** — 영양제 라벨/성분표 사진을 entry에 첨부. 파일 저장(R2)/용량 관리/썸네일 처리 필요.
- **추가 성분 구조화** — 현재 `effects`/`notes`는 free text. 미네랄 종류, 효능 카테고리 등을 structured fields로 분리.
- **격주 복용 패턴** — `cycle.{onWeeks, offWeeks, startDate}` 타입은 이미 정의됨 (현재 null 유지). UI/실행 로직 미구현. 격일은 요일 custom 선택으로 처리 가능.
- **시간 범위 입력 (timeEnd)** — "오전 8–10시" 같은 유연한 시간 표현. v1엔 있었으나 v2에서 UI 제거. 필요 시 재도입.
- **영양제 별칭(alias) 검색** — "유산균"으로 포스트바이오틱스/프로바이오틱스 찾기. supplements 테이블에 aliases JSON 컬럼 또는 별도 table.
- **영양제 추가/편집** — 라이브러리는 현재 read-only. 관리자 UI (admin) 또는 사용자 제안 → 승인 흐름.

### email-diag

- **Locale 토글 시 분석 재생성 + 캐시 (A+D 조합)**
  - 현재 동작: 결과 화면에서 locale 토글하면 정적 UI는 즉시 바뀌지만 이미 생성된 AI 분석(Verdict)은 원래 언어로 남음.
  - 개선안 A: locale 변경 시 같은 도메인 자동 재진단해서 새 언어 분석 받기.
  - 개선안 D: 한 번 받은 언어는 클라이언트 메모리에 캐시 → 재방문 시 즉시 표시.
  - 트레이드오프: A는 토글 시 1회 추가 API 호출 (Workers AI 무료 한도 내). D는 코드 복잡도 약간 증가 (메모리 캐시 hook).
  - 재사용성: 미래 모든 AI 출력 도구에 동일한 패턴 적용 가능 → `useLocaleAwareResult` hook으로 만들면 factory 자산.
  - 결정 보류 사유: MVP 수준에선 현재 동작도 수용 가능. 실제 사용자의 토글 패턴 데이터 본 후 결정.
