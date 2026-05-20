# 사주 작명 Changelog

주요 결정 / 이정표.

## [Unreleased]

### Added
- `migrations/003_hanja_full.sql` — hanja 테이블 신 스키마. 신규 5컬럼 (codepoint/won_stroke/ja_ohaeng/radical/meaning_en) + 신규 2 index (radical/ja_ohaeng). (C-5-1)

### Changed
- hanja 테이블 재생성 (DROP + CREATE). SQLite NOT NULL 제거 불가 → ALTER 불가능.
- `meaning` NOT NULL → NULL 허용 (D안 886자 의미 전무 수용).

### Notes
- `002_hanja_seed.sql`의 25자는 003 apply 시 소실. 9,460자(공식 9,389 + 71 초과) 적재는 C-5-2 ~ C-5-6에서 진행. 002 파일은 historical migration으로 보존 (삭제 X).
- 71자 reconcile은 C-5-8에서 efamily 권위 리스트 확보 후 처리.
- migration apply는 Brenn 수동 (dev `--env preview --remote` / prod `--remote`).
- partial/복합 index 및 consonant 컬럼은 C-5-7 (recommend WHERE 재설계) 시점에 별도 migration으로 검토.

### Decided (C-5-2 (α) quick check 결과)
- (α) 1차 시도 가능성 = 낮음. fallback 채택. 상세: `docs/learnings/2026-05-20-saju-naming-efamily-scout.md` (commit 79281c5).
- C-5-2 추정 0.5d 유지. 9,460 전량 적재 + inname_ok=1 임시.
- 71자 reconcile + inname_ok 정확화는 C-5-8 (critical) 전담. 우선순위: (a) law.go.kr 별표 / (b) efamily PDF / (c) efamily 조회 순회.
- efamily 라이센스 발견: "Copyright©Supreme Court of Korea. All Rights reserved." — KOGL/공공누리/CC 없음. C-5-8 진행 시 라이센스 risk 인지 필수.

### Added (C-5-2 본 적재)
- `app/tools/saju-naming/scripts/build-staged-hanja.ts` — rutopio gov+naver CSV → staged JSON 빌드 스크립트.
- `app/tools/saju-naming/scripts/data/staged-hanja.json` — 9,460자 staged 데이터 (음 복수 primary + alternatives 메타 보존, meaning_en null → C-5-3에서 채움).
- 의존성: csv-parse (devDependency, MIT).

### Decided (C-5-2 본 적재)
- hangeul/hangeul_all 소스 = gov hangul (대법원 인명용 지정 발음 authority). naver 발음은 인명용 비허용 가능성 있어 hangeul 후보로 부적합 → 도메인상 gov만 채택.
- hangeul/hangeul_all gov authority 원칙 + naver fallback (gov 발음 gap 시 한정, 현재 𥡴 1자). gov는 데이터 제공 시 authority — gap에서는 authority 없음 + naver 의미가 인명용 명시 (예: "사람 이름 계") → fallback 자연.
- meaning/meaning_all = naver verbatim "훈 음" 형식 (예: "아름다울 미"). 훈-음 분리는 C-5-6.
- 9,460 전량 inname_ok=1 (fallback). 71자 미구분 → C-5-8 reconcile.
- Join key = Unicode 코드포인트 정수.

### Added (C-5-3 Unihan 추출)
- `app/tools/saju-naming/scripts/build-staged-unihan.ts` — Unihan kRSUnicode/kTotalStrokes/kDefinition 추출 스크립트.
- `app/tools/saju-naming/scripts/data/staged-unihan.json` — 9,460 한자 부수/획수/영어 의미 (비표준 405자는 null).
- 의존성: adm-zip + @types/adm-zip (devDependency, MIT).

### Decided (C-5-3 Unihan 추출)
- 부수 표준 = kRSUnicode (부수번호 1~214 = 강희 214부수). kRSKangXi는 Unicode 15.1에서 withdrawn → kRSUnicode 채택 (강희사전 부수 표준 의도 동일 유지).
- 다중값 (kRSUnicode/kTotalStrokes) → 첫 값 사용 + 다중값 한자 수 콘솔 record.
- meaning_en = kDefinition verbatim (raw 보존, 향후 가공은 별도 task).
- Scope = staged-hanja.json codepoint set 한정 (Unihan 전체 over-scope).
- 비표준 405자 (plane 10/15) Unihan join 불가 — staged JSON에 null 정직 기록. 003 NOT NULL 충돌은 C-5-6 진입 시 nullable patch로 해소.

## [0.6.5] — 2026-05-19

### Decided (C-2/C-3 정찰 매듭 + D안 채택)

- **C-2/C-3 DONE** — 데이터 소스 확정: rutopio gov(MIT) + rutopio naver(MIT) + Unihan(Unicode ToU). rycont는 Unihan(`kRSUnicode`/`kTotalStrokes`/`kDefinition`)으로 대체. 전 소스 라이센스 안전, join key = 코드포인트.
- **cover율 실측 정정** ⚠️ — 이전 리포트 "1,294자 영어 fallback 100% cover" 부정확. 실측 (정규화 일관): gov 9,443 / naver 8,095 / 교집합 7,945 / gov-only 1,498 (비표준 406 + 실제CJK 1,092) / 영어 cover 612 / 의미 전무 886. "1,294"는 단순 뺄셈 오류.
- **Part 1 — 누락 1,498자 성격 분석** — 압도적 벽자 (강희자전 100% 등재, 교육용 한자 1.5%, 작명 실무 가치 ≈ 0). 2024 신규 추가 아님 (전부 고전 한자). 상세: `docs/learnings/2026-05-19-saju-naming-task-39b-recon.md`.
- **D안 채택** — 9,443자(공식 9,389) 전부 D1 적재 + 추천은 의미 보유 8,557자만 (`is_recommendable`). Part 2(추가 소스 정찰) skip — 효능감 우선.
- **C-4-A 방향 전환** — 라이센스 안전 데이터셋 미발견 → 214부수×5행 표준 매핑표 자체 구축.
- **C-5 7단계 분해** — C-5-1(스키마)~C-5-7(dev 적재·검증). BACKLOG에 의존·추정·주의점 표.
- 코드 변경 없음 (문서만).

## [0.6.4] — 2026-05-19

### Decided (C-4 도메인 결정 매듭 시작)

- **C-4-B 원획법 확정** — 부수 14개 환원표 (yesname.co.kr 출처, 명리학 통용 표준) BACKLOG에 inline. 忄/氵/扌/犭→+1, 王/礻→+1, 月/耂/衤/艹/罒→원형, 辶/阝(좌·우)→환원. 숫자 한자 의미값 환원 룰 포함. C-5 `stroke_count` 계산에 직접 적용.
- **C-4-A 자원오행 데이터셋 방향 결정** — 부수 단위 통상 매핑(옵션 i) 대신 인명용 한자 분류 데이터셋(옵션 ii) 채택. 근거: 자원오행은 부수+의미 2단계 결정이라 룰 자동화 한계. C-2/C-3 정찰에 통합. 초기 ~95% 정확도 데이터셋 적재 후 build-in-public 정정.
- 코드 변경 없음 (BACKLOG.md 문서만). 0.6.3 BACKLOG 분해 이후 도메인 결정 매듭 시작.

## [0.6.3] — 2026-05-19

### Changed (BACKLOG 재정의)

- **Task 39-B 5단계 분해** — 기존 "풀 데이터 적재" 단일 entry → C-1(자수 정정, DONE) / C-2(데이터 소스 정찰) / C-3(라이센스+join 검증) / C-4-A·B(자원오행·원획법 도메인 결정 대기) / C-5(5-way join+bulk insert+`migrations/003`, BLOCKED).
- **도메인 결정 사항 서브섹션 신설** — C-4-A 자원오행(214 부수→오행 매핑), C-4-B 원획법(부수 원형 획수 환원), 자료 공유 형식 3옵션. Brenn 명리학 자료 공유 시 채움.
- **39-C 분리** — `calcOhaengScore`/`calcSoundScore` base값 튜닝(현재 base=0)을 Task 41에서 분리. 39-B C-5 완료 의존.
- **44 UI live 의존성 명시** — 39-B 완료 = 추천 품질 정상화 = 효능감 정상 → 44 진입 준비.
- 코드 변경 없음 (BACKLOG.md 문서만). 0.6.x 진단 매듭 시리즈 연속.

## [0.6.2] — 2026-05-19

### Reverted (진단 매듭)
- `0.5.4` 진단성 변경 (`--webpack` flag) 원복. `package.json` scripts.build: `next build --webpack` → `next build` (Next.js 16 default = Turbopack).
- 동기: `0.6.1`에서 진짜 root cause(`runtime = "edge"`)가 제거됐으므로 Turbopack silent fail 대상 없음. CI 빌드 시간 회복 (~1m 12s → ~30s, Deploy Preview 8-12분 → 5-7분).
- 사후 검증: dev 재배포 후 3개 curl 200 확인 필수. 1개라도 500이면 새 Turbopack silent fail 가능성 → 다시 Webpack로 복귀 + 진단.

### 0.5.x ~ 0.6.x 매듭 요약

| 버전 | 시도 / 결과 |
|---|---|
| 0.5.0 | T42 첫 D1 API 추가 (recommend, hanja/search). dev 배포 후 500 발견 |
| 0.5.1 | 옵션 A: namespace + unwrap. dev 재배포 후 동일 fingerprint(`ee32c12c...`) |
| 0.5.2 | 옵션 D-2: vendoring. 동일 fingerprint |
| 0.5.3 | 옵션 E: vendor named export. 동일 fingerprint |
| 0.5.4 | 진단성: Turbopack OFF (--webpack). Webpack 빌드가 진짜 에러 노출 |
| 0.6.0 | 옵션 평탄화: hanja/search → hanja-search. 부차 fix (컨벤션 정렬은 유지) |
| **0.6.1** | **진짜 root cause**: `runtime = "edge"` 명시 제거. dev 3 curl 200 확인 ✓ |
| **0.6.2** | 진단 매듭: Turbopack 복귀 |

교훈:
- `runtime = "edge"` 명시는 OpenNext + Cloudflare adapter에서 미지원. 다른 도구처럼 명시 생략이 default.
- Turbopack의 silent fail이 5번의 잘못된 가설 유도. Webpack 빌드로 명시적 에러 받아내는 게 진단의 핵심.

## [0.6.1] — 2026-05-19

### Fixed (진짜 진짜 root cause)
- `0.6.0` 경로 평탄화 후에도 Deploy Preview 빌드 동일 에러:
  > `app/api/saju-naming/hanja-search/route cannot use the edge runtime. OpenNext requires edge runtime function to be defined in a separate function.`
- 2단 중첩 vs 단일 segment는 root cause 아니었음. **`export const runtime = "edge"` 명시 자체**가 OpenNext + Cloudflare adapter의 `separate function` 제약 발동.
- 정찰: `runtime = "edge"` 명시는 **saju-naming 3개 route만**. 다른 도구 (cron-trans/email-diag/feedback/supp-plan/library/admin) 모두 0건. middleware.ts도 Task 25-A-fix(0.5.4)에서 같은 이유로 제거됨.
- OpenNext source 확증: `@opennextjs/cloudflare` migrate.js 메시지 "The edge runtime is not supported yet with @opennextjs/cloudflare". 에러 출처 `@opennextjs/aws/dist/build/copyTracedFiles.js:130-132`.
- **fix**: 3개 saju-naming route에서 `export const runtime = "edge";` 라인 제거. 다른 도구 컨벤션 정렬.

### Kept
- `0.6.0` 경로 평탄화 (`hanja/search` → `hanja-search`) 유지 — 단일 segment 컨벤션은 다른 도구 (supp-plan/library) 일관성 + 향후 `/api/saju-naming/hanja-search?character=美` 같은 single-resource 확장 자연.
- `0.5.3` vendor named export, `0.5.2` vendoring, `0.5.4` Turbopack OFF 모두 유지 — 각 단계가 미래에 같은 함정 막는 안전망.

### Notes
- Turbopack 복귀는 별도 task. 본 fix 검증 후.
- 0.5.x ~ 0.6.0 시도 매듭: import 형태/위치는 모두 부차였고 `runtime = "edge"` 명시가 진짜 root cause. 진단 비용 ↑ — Turbopack의 silent fail이 5번의 잘못된 가설을 유도.

## [0.6.0] — 2026-05-19

### Fixed (진짜 root cause)
- Turbopack OFF (`0.5.4` 진단)로 Webpack 빌드 시 노출된 명시적 에러:
  > `app/api/saju-naming/hanja/search/route cannot use the edge runtime. OpenNext requires edge runtime function to be defined in a separate function.`
- **진짜 root cause**: `/api/saju-naming/hanja/search` 2단 중첩 route가 OpenNext의 edge runtime 함수 정의 제약 위반. Turbopack은 이 위반을 silent하게 무시 + broken bundle 출력 → 런타임 `Cannot read properties of undefined (reading 'default')` throw. 옵션 A/D-2/E (`0.5.1/0.5.2/0.5.3`)는 모두 이 진짜 원인을 모른 채 import 형태만 수정 시도해서 동일 fingerprint(`ee32c12c...`) 재현.
- **fix**: `app/api/saju-naming/hanja/search/route.ts` → `app/api/saju-naming/hanja-search/route.ts` (경로 평탄화). supp-plan/cron-trans 등 정상 동작 도구의 단일 segment 패턴 일관.

### Changed
- `poc/hanja-search-api.test.ts`: import path + 테스트 URL + 출력 메시지 갱신 (`/hanja/search` → `/hanja-search`).
- `BACKLOG.md` T42 hanja entry 경로 갱신.

### Notes
- **외부 URL 변경**: `https://*/api/saju-naming/hanja/search` → `/hanja-search`. 호출 측 0건 (도구 UI coming-soon)이라 무손실.
- Turbopack OFF (`0.5.4`) 유지 — 본 fix가 효과 있는지 확인 후 별도 task에서 복귀 검증.
- vendor의 default → named export 변형(`0.5.3`)도 유지 — 정상 도구 named import 컨벤션 일관.

## [0.5.4] — 2026-05-19

### Changed (진단용 임시)
- `package.json` scripts.build: `next build` → `next build --webpack`. Next.js 16의 Turbopack default 비활성화.
- 동기: 옵션 A/D-2/E (0.5.1/0.5.2/0.5.3) 모두 같은 fingerprint(`ee32c12c...`)로 실패. import 형태/위치 무관 → **Turbopack의 chunk wrapper가 vendor bundle (IIFE 등 오래된 모듈 패턴) 트랜스파일 단계에서 module shape 손상** 가설 검증.
- 사후 분기: dev 재배포 후 curl 결과 — 200이면 Turbopack root cause 확정 (영구 fix 별도 task), 500이면 D-3 또는 D-4 escalate.
- 빌드 시간 ↑ 예상 (Webpack > Turbopack). 검증 후 결정.

## [0.5.3] — 2026-05-19

### Fixed
- `0.5.2` 옵션 D-2 (vendoring + default import) 실패. dev 재배포 후 동일 500 + 동일 fingerprint (`ee32c12c...`) — vendor 위치 무관 default import 자체가 문제.
- 진단 (D-4):
  - `x-opennext: 1` 헤더 + `Content-Type: text/plain` 응답 → 우리 try/catch 미진입, OpenNext wrapper의 generic 500. → **module evaluation 단계 throw**
  - saju-naming만 500, supp-plan/cron-trans/email-diag 등 모두 200. 공통: 정상 도구는 **모두 named import**.
  - 결론: `export { ... as default }` ESM 패턴이 OpenNext + Workers Edge runtime esbuild interop의 `.default` 액세스에서 실패.
- **옵션 E 채택**: vendor 파일의 default export 라인을 named로 변형. import 측도 named로.
  - `vendor/korean-lunar-calendar.js` 마지막 줄: `export { KoreanLunarCalendar as default };` → `export { KoreanLunarCalendar };`
  - `vendor/korean-lunar-calendar.d.ts`: 동일 패턴
  - `lib/saju.ts` + `poc/saju-poc.ts`: `import KoreanLunarCalendar from "..."` → `import { KoreanLunarCalendar } from "..."`
- `vendor/README.md`: 변형 사실 명시 + 패키지 sync 시 같은 변형 재적용 절차 추가.

### Notes
- saju-naming 전체 import 중 default 형태 0건. 정상 도구 컨벤션 (named) 일관.
- 옵션 E도 실패 시 D-3 (자체 lunar conversion 구현) 또는 GH Actions workflow에 `upload-artifact` 추가해 .open-next bundle 다운로드 진단.

## [0.5.2] — 2026-05-19

### Fixed
- `0.5.1` 옵션 A 실패 (dev 재배포 후에도 동일 500 throw). namespace import도 root path module resolution을 거쳐 같은 결과.
- 옵션 C (`/dist/esm/` internal path) 시도 → Next.js Edge bundler가 패키지 `exports` 필드 gating을 엄격 적용해 빌드 단계 실패 (`Module not found`). 옵션 B도 같은 이유로 시도 X.
- **옵션 D-2 (vendoring) 채택**: ESM bundle을 `app/tools/saju-naming/lib/vendor/`로 복사. `lib/saju.ts`/`poc/saju-poc.ts`는 relative path import. npm 패키지 의존성 제거.
- 라이센스 (MIT) + 출처 문서 (`vendor/README.md`) 동봉. 업데이트 sync 방법 README 명시.

### Removed
- `package.json` `dependencies`에서 `korean-lunar-calendar` 제거 (vendor 채택으로 dead dep).

### Notes
- `eslint.config.mjs` `globalIgnores`에 `app/tools/*/lib/vendor/**` 추가 — vendored bundle은 lint 대상 외.
- `cloudflare-env.d.ts`에 `NAMING_DB: D1Database` 타입 등록 — `0.4.0` binding의 typegen 결과 (관련 작업 매듭).

## [0.5.1] — 2026-05-19

### Fixed
- `lib/saju.ts`의 `korean-lunar-calendar` default import → namespace import + 안전 unwrap. Workers Edge runtime에서 `Cannot read properties of undefined (reading 'default')`로 모든 saju-naming endpoint 500 반환하던 문제 해결.
- 원인: 패키지 `exports` 필드에 `"import"` 조건 부재 → CJS-to-ESM interop wrap 실패. tsx (Node ESM) 환경은 동작했지만 Workers는 실패. PoC 회귀로는 감지 불가했던 환경 차이.
- 호환: `(KLCModule as ...).default ?? KLCModule` 패턴으로 모든 환경 (Node/Workers/Browser) 동작.

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
