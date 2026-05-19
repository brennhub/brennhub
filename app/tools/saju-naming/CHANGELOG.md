# 사주 작명 Changelog

주요 결정 / 이정표.

## [0.5.0] — 2026-05-19

### Added
- `app/api/saju-naming/recommend/route.ts` — POST, edge runtime. D1 `NAMING_DB.hanja` (inname_ok=1) 풀 fetch → `recommendNames()` 적용 → `{candidates}` 반환. 입력: `{sungHanja, sungStroke, yongsin, gisin, nameLength, topN?, excludeChars?}`.
- `app/api/saju-naming/hanja/search/route.ts` — GET, edge. 동적 WHERE (hangeul/ohaeng/strokeMin/strokeMax) + 페이지네이션 (limit/offset). 정렬 `frequency DESC, stroke ASC, character`. 응답 `{results, total}`.
- `poc/recommend-api.test.ts`, `poc/hanja-search-api.test.ts` — 입력 검증 PoC (각 5 케이스). D1 happy path는 사후 Brenn curl 검증 (supp-plan 패턴 일관).

### Notes
- 두 endpoint 모두 saju-naming의 **첫 D1 사용 API**. NAMING_DB binding `0.4.0`에서 등록 + 시드 25자 적용 (Phase 3 완료) 전제.
- 에러 처리: 400 (`INVALID_JSON/INVALID_INPUT/OUT_OF_RANGE`) + 500 (`DB_UNAVAILABLE/DB_ERROR/SERVER_ERROR`).
- 빈 결과는 200 + empty array (REST 컨벤션).

## [0.4.1] — 2026-05-19

### Changed
- `lib/surie.ts` + `lib/names.ts` inline `process.exit` 검증 블록을 `poc/surie-poc.test.ts` / `poc/names-poc.test.ts`로 분리. ohaeng.ts(`0.3.0`)와 동일 패턴.
- 동기: 향후 `/api/recommend` 가 `names.ts` import 시 Edge runtime 위반 사전 차단. 기능 동등 (출력 + assertion 동일).

## [0.4.0] — 2026-05-19

### Added
- D1 binding `NAMING_DB` 등록 (`wrangler.jsonc` top-level + env.preview 양쪽).
  - prod: `brennhub-saju-naming` (id `2b4853be-...`)
  - preview: `brennhub-saju-naming-dev` (id `48fce286-...`)
- 다음 Phase: Brenn 수동 `wrangler d1 execute ... --file=app/tools/saju-naming/migrations/{001,002}*.sql --remote` (dev/prod 각 2회).

### Notes
- supp-plan 컨벤션 일관 — binding 이름 도구 단위(`NAMING_DB`), `-dev` 접미사 database_name으로 환경 분리, `--env preview` 미사용.
- `cloudflare-env.d.ts`는 본 commit에 미포함. Brenn `npm run cf-typegen` 실행 시 자동 갱신.

## [0.3.0] — 2026-05-19

### Added
- `app/api/saju-naming/saju/route.ts` — POST endpoint, edge runtime. 입력 `{year, month, day, hour, isLunar}` → 응답 `{saju, ohaeng}`. D1 의존 없음. 자체 type guard 검증 + 범위 체크 (year 1000-2050 외 등).
- `poc/saju-api.test.ts` — route handler 직접 호출 통합 검증 (POC 동등 결과 + 잘못된 JSON / 범위 위반 / 타입 불일치 케이스 포함).

### Notes
- 응답 schema는 lib `SajuResult`와 분리. `toApiSaju` 매퍼로 4기둥 + lunarDate만 노출. 오행 정보는 `analyzeOhaeng` 결과(`ohaeng` 객체)에만.
- `/api/saju-naming/recommend`, `/api/saju-naming/hanja`는 한자 DB 풀 적재 (T39-B) 후 별도.

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
