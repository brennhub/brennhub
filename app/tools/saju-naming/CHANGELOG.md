# 사주 작명 Changelog

주요 결정 / 이정표.

## [0.2.0] — 2026-05-19

### Added
- `lib/saju.ts` — 사주팔자 4기둥 계산 모듈 (검증 완료: 외숙모 케이스 5/5)
- `lib/ohaeng.ts` — 오행 분석 모듈 (용신/기신 결정, 기신우선 충돌 정책)
- `lib/surie.ts` — 81수리 계산 모듈 (4격 + totalScore 0-100)
- `lib/names.ts` — 이름 추천 알고리즘 (오행40%·수리35%·발음25% 가중치)
- `migrations/001_hanja.sql` — D1 hanja 테이블 스키마
- `migrations/002_hanja_seed.sql` — 오행별 시드 25자

### Notes
- 발음오행 base=0 (중립 글자 0점). 39-B 적재 후 재검토 예정.
- ts-node ESM 이슈 → tsx로 회피 (별도 정리 예정)

## [0.1.0] — 2026-05-19
- **도구 신설** — saju-naming 폴더 + 문서 골격 (README/BACKLOG/CHANGELOG).
- **Workers 스택 확정** — Cloudflare Workers (Edge) + D1 + Workers AI/Anthropic. 다른 도구와 동일 스택. 별도 백엔드 운영 X.
- **PoC 완성** — `poc/saju-poc.ts`: `korean-lunar-calendar` 기반 사주 4주 계산, 오행 집계, 부족/과다 판별. 1959-05-15 09:00 양력 테스트 케이스.
- **랜딩 골격** — `/naming` (`app/naming/page.tsx`): Hero + 차별점 3개 + 가격 3단. 후속 섹션 TODO 주석.
- **의존성** — `korean-lunar-calendar` npm 추가 (Workers 호환).
