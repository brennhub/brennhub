# saju-naming Backlog

Task 단위 체크리스트. 완료 시 `[x]` + CHANGELOG에 요약 이동.

## Step 1 — 사주 계산 엔진

### Task 37 — 사주팔자 계산
- [x] `lib/saju.ts` — `Pillar`, `SajuResult`, 상수 + `calculateSaju(year, month, day, hour, isLunar)`
- [x] 시주 계산 (일간 기준 `DAY_STEM_HOUR_BASE` 매핑)
- [x] 음력 ↔ 양력 변환 (`korean-lunar-calendar`)
- [x] PoC 검증 (`poc/saju-poc.test.ts`, 1979-05-29 05:00 양력 — 5/5 통과)
- [ ] 자정 경계 / 윤달 / 입춘 기준 처리 결정 (Phase 2)

### Task 38 — 오행 분석
- [x] 천간/지지 → 오행 매핑 (`CHEONGAN_OHAENG`, `JIJI_OHAENG` — saju.ts)
- [x] 8글자 → 오행 5원소 카운트
- [x] 부족(==0) / 과다(≥3) 판별
- [x] 용신/기신 결정 로직 (`lib/ohaeng.ts`, 기신 우선 충돌 정책)

## Step 2 — 데이터 인프라

### Task 39 — 한자 DB
- [x] D1 스키마 설계 + 마이그레이션 파일 (`migrations/001_hanja.sql`) — 39-A
- [x] 시드 데이터 25자 (오행별 5자, `migrations/002_hanja_seed.sql`) — 39-A
- [x] D1 binding `NAMING_DB` (wrangler.jsonc, prod + preview) — `0.4.0` (prod `2b4853be...`, preview `48fce286...`). migrations apply는 Brenn 수동 후속.
- [ ] 음 → 한자 후보 조회 API (hanja-search API로 부분 충족)
- [ ] 한자 → 의미/오행 조회

#### 39-B — 인명용 한자 풀 데이터 적재 (9,389자, 2024-06-11 대법원규칙 제3151호)

5단계: C-1~C-3 데이터/조사, C-4 도메인 결정, C-5 코드.
진행: C-1~C-4 DONE / C-5 7단계 분해 완료 → 진입 가능.

- [x] **C-1 자수 정정** — 8,142자(인수인계 오류) → 9,389자 확정. BACKLOG/문서 반영 완료.
- [x] **C-2 데이터 소스 정찰** [DONE] — 채택: rutopio gov(MIT) + rutopio naver(MIT) + Unihan(Unicode ToU). rycont는 Unihan으로 대체 (부수 `kRSUnicode` / 획수 `kTotalStrokes` / 영어정의 `kDefinition`로 충분).
- [x] **C-3 라이센스 + join 검증** [DONE] — 전 소스 라이센스 안전 (재배포 허용). Join key = Unicode 코드포인트. 정규화(코드포인트 문자열 → 실제 글자) 후 join.
- [x] **C-4-A 자원오행 매핑 룰** [표준 매핑 자체 구축]
- [x] **C-4-B 원획법 변환 룰** [도메인 결정 완료]
- [ ] **C-5 5-way join + bulk insert + `migrations/003_hanja_full.sql`** — 7단계 분해 (아래). [진입 가능]

##### C-2/C-3 정찰 결과 — cover율 (정규화 일관 실측)

| 항목 | 값 |
|---|---|
| rutopio gov 고유 한자 | 9,443 (10,163 entries) |
| 공식 인명용 한자 | 9,389 (54자 차이 → C-5-2 reconcile) |
| rutopio naver 고유 한자 | 8,095 |
| 교집합 (한국어 의미 보유) | 7,945 |
| gov-only (한국어 의미 없음) | 1,498 = 비표준 코드포인트 406 + 실제 CJK 1,092 |
| gov-only 중 영어(Unihan `kDefinition`) 보유 | 612 |
| 의미 전무 (한·영 모두 없음) | 886 |

검산: 교집합 7,945 + gov-only 1,498 = 9,443 (gov 고유) ✓

**이전 thread 리포트 정정** ⚠️ — "1,294자 영어 fallback, 100% cover"는 부정확.
- "1,294"는 `9,389 − 8,095` 단순 뺄셈. naver에 gov에 없는 870자가 있어 단순 뺄셈 불성립. 실제 집합차 = 1,498자.
- 영어 fallback도 612자만 가능 (100% 아님). 886자는 한·영 의미 모두 없음.
- 상세: `docs/learnings/2026-05-19-saju-naming-task-39b-recon.md`.

> **정정 (C-5-2 정찰, 본 표 수치는 0.6.5 정찰 매듭 당시 보존)**: gov 9,460 / 교집합 7,960 / gov-only 1,500 / 영어 cover 613 / 의미 전무 887 / 추천 8,573 / 공식 대비 초과 71자. 적재 구현은 정정값 사용. 상세 `2026-05-19-saju-naming-c5-2-recon.md` 항목 1.

##### D안 — 적재 정책 [확정]

- 9,443자 (공식 9,389) **전부 D1 적재** — 데이터 보존.
- 추천 알고리즘은 **의미 보유 8,557자** (한국어 7,945 + 영어전용 612)만 사용 — `is_recommendable=1`.
- 886 의미 전무 벽자: 적재하되 `is_recommendable=0` → 추천 후보 제외.
- 근거: 효능감 우선. Part 1에서 1,498 누락분이 압도적 벽자 (교육용 1.5%, 작명 실무 가치 ≈ 0)로 판명 → 추가 데이터 소스 정찰(Part 2)은 비용 대비 효용 낮아 skip.

##### C-4-B 원획법 변환 룰 [확정]

부수 14개 환원표 (yesname.co.kr 출처, 명리학 통용 표준):

| 부수 | 필획 | 원획 | 원형 |
|------|------|------|------|
| 忄 심방변 | 3 | 4 | 心 |
| 氵 삼수변 | 3 | 4 | 水 |
| 扌 재방변 | 3 | 4 | 手 |
| 犭 개사슴록 | 3 | 4 | 犬 |
| 王 구슬옥변 | 4 | 5 | 玉 |
| 礻 보일시변 | 4 | 5 | 示 |
| 月 육달월 | 4 | 6 | 肉 |
| 耂 늙을로엄 | 4 | 6 | 老 |
| 衤 옷의변 | 5 | 6 | 衣 |
| 艹 초두머리 | 4 | 6 | 艸 |
| 罒 그물망 | 5 | 6 | 网 |
| 辶 책받침 | 4 | 7 | 辵 |
| 阝 좌부방(언덕부) | 3 | 7 | 阜 |
| 阝 우부방(고을읍) | 3 | 8 | 邑 |

숫자 한자: 의미값 환원 — 一=1, 二=2, 三=3, 四=4, 五=5, 六=6, 七=7, 八=8, 九=9, 十=10. 百=6, 千=3, 萬=15.

적용: C-5 단계의 `stroke_count` 컬럼 계산 시 위 룰을 부수 매핑으로 적용.

##### C-4-A 자원오행 매핑 룰 [표준 매핑 자체 구축]

결정: C-2/C-3 정찰 결과 라이센스 안전한 자원오행 분류 데이터셋을 찾지 못함 → **부수 → 오행 표준 매핑표를 자체 구축**.

방식:
- Unihan `kRSUnicode` 부수 정보 사용 → 214 부수 × 5행(목·화·토·금·수) 매핑표 자체 작성.
- 작명소 통용 표준 매핑 (예: 木/竹/艸→목, 火/日→화, 土/石/山→토, 金/玉→금, 水/氵/雨→수). 출처는 매핑표 docstring에 명기.
- C-5-4 단계에서 web_search 정찰 + 통용 매핑 정리.

한계 + 개선:
- 자원오행은 본래 부수+의미 2단계 결정이라 부수 단일 매핑은 근사치. 학파별 차이 존재.
- build-in-public: 사용 피드백 + 김기승 "자원오행 성명학"(632쪽) 등 권위서 참조로 점진 정정.

##### C-5 — 5-way join + 적재 (7단계 분해)

임계 경로: C-5-1 → C-5-2 → C-5-6 → C-5-7. C-5-3 / C-5-4는 C-5-1과 독립 (병렬 가능). C-5-3 / C-5-4 외에 C-5-8도 C-5-2와 병렬 시도 가능.

| 단계 | 내용 | 의존 | 추정 | 주의점 |
|---|---|---|---|---|
| **C-5-1** ✅ | D1 스키마 설계 — `migrations/003_hanja_full.sql` (DROP + CREATE 신 테이블, 컬럼 12 / index 5) | — | 완료 | 신 테이블 확정 (ALTER 아님 — SQLite NOT NULL 완화 불가). 상세 ↓ §C-5-1 결과 |
| **C-5-2** ✅ | rutopio gov+naver 적재 스크립트 — CSV 파싱 + 코드포인트 정규화 + join. 9,460↔9,389 reconcile (71자 초과, efamily 매칭 필요) 결과: 9,460자 staged JSON 생성 (scripts/data/staged-hanja.json). 71자 미구분 + inname_ok=1 fallback (C-5-8 reconcile 대기). | C-5-1 | 0.5d | 한 한자에 음 복수 (가/나 두음 등) → hangeul 다중값 처리 정책 |
| **C-5-3** | Unihan 추출 스크립트 — 부수(`kRSUnicode`)/획수(`kTotalStrokes`)/영어정의(`kDefinition`). UAX #38 탭 파싱 | — (병렬) | 0.5d | Unihan 8.5MB — repo 미포함, 스크립트가 다운로드 or 캐시 |
| **C-5-4** | 214부수×5행 자원오행 매핑표 자체 구축 — web_search 정찰 + 작명소 통용 매핑 정리 + 출처 docstring | — (병렬) | 1d | 학파 차이 → 표준안 1개 확정. C-4-A 결정 사항 |
| **C-5-5** | 원획법(C-4-B) 코드화 — `lib/saju-naming/won-stroke.ts`. 14부수 환원표 + 숫자 한자 룰 | C-5-3 | 0.5d | C-4-B 확정표 그대로. PoC 검증 |
| **C-5-6** | 별도 bulk INSERT 마이그레이션 생성 (파일명은 C-5-6 진입 시 확정 — `002_hanja_seed.sql` 네이밍과 일관) — 5-way join 결과 bulk INSERT, 배치 분할 | C-5-1~5 | 0.5d | D1 제약: statement 크기 / 변수 수 한도 → 배치 (~수백 row/INSERT). 003은 C-5-1에서 스키마 전용 확정 |
| **C-5-7** | dev 적재 + 검증 — `wrangler d1 execute`, COUNT 9,460, spot-check, hanja-search/recommend API 회귀 | C-5-6 | 0.5d→1d? | Brenn 수동 apply 가능성. 적재 후 39-C(점수 base) 진입 가능. ⚠️ recommend WHERE 재설계 필요 — 상세 ↓ §C-5-7 보류 |
| **C-5-8** (critical) | efamily.scourt.go.kr 공식 9,389 인명용 한자 리스트 확보 → 71자 초과 reconcile → inname_ok 정확화 UPDATE 우선순위: (a) law.go.kr 「가족관계의 등록 등에 관한 규칙」 제37조 별표1/2 [법령=저작권 비대상, 추출성 선확인] / (b) efamily PDF [현행이나 'All Rights Reserved' 라이센스 제약] / (c) efamily 조회 485 한글음 순회 [최후수단] | C-5-2 (또는 병렬 시도) | 0.5d | 호적 등록 risk 정확화. 44 UI live 출시 전 필수. quick check 결과에 따라 C-5-2 fallback 분기 결정 |

##### C-5-1 결과 — hanja 신 스키마 확정 [완료 2026-05-19]

- 결정: 신 테이블 (DROP + CREATE), 테이블 이름 `hanja` 유지.
- 근거: SQLite NOT NULL 완화 불가 + 기존 25자 손실 비용 0.
- 컬럼: 기존 7 보존 + 신규 5 (codepoint, won_stroke, ja_ohaeng, radical, meaning_en) = 12.
- `meaning` NOT NULL → NULL 허용 (D안 886자 의미 전무 수용).
- `is_recommendable` 컬럼 X — query time 판정 (C-5-7).
- `consonant` 컬럼 X — 현재 활용 case 0, 향후 ADD COLUMN 가능.
- index: 기존 3 + 신규 2 (radical, ja_ohaeng) = 5.
- partial index 보류 — C-5-7 진입 시 별도 migration.
- 정찰 record: `docs/learnings/2026-05-19-saju-naming-c5-1-recon.md`.
- migration apply: Brenn 수동 (dev `--env preview --remote` / prod `--remote`).

##### C-5-7 보류 — C-5-1 정찰 발견

- ⚠️ recommend route 현재 `WHERE inname_ok = 1`만 — 전 row 메모리 필터 패턴. 9,389자 적재 후 latency 위험.
- 작업 범위가 단순 query 수정 + index 추가가 아닐 가능성 (WHERE 재설계 + LIMIT + ORDER BY 도입 필수).
- 진입 시 0.5d → 1d 재추정 또는 분리 검토 (적재 검증 / WHERE 재설계).
- partial/복합 index 및 `consonant` 컬럼은 본 단계에서 별도 migration으로 추가 검토.

#### 39-C — 점수 base 튜닝 (39-B 적재 후)

- [ ] `calcOhaengScore` / `calcSoundScore` base값 재검토 — 현재 base=0. 39-B 풀 데이터 적재 후 실제 점수 분포 측정 → base 재설정.
- 의존: 39-B C-5 완료 필수 (25자 시드로는 분포 측정 불가).

### Task 40 — 81수리 (수리길흉)
- [x] `lib/surie.ts` — 원형이정 (元亨利貞) 4격 계산
- [x] 81수 길흉 매핑 (1-50 테이블 + 51+ 순환 매핑 `((n-1)%50)+1`)
- [x] 외자/3자 이름 모두 지원 (`calculateSurie(sungStroke, name1, name2?)`)
- [x] 길수/흉수 점수화 (대길=25/길=20/반길=10/흉=0, totalScore 0-100)

## Step 3 — 추천 로직 + API

### Task 41 — 이름 추천
- [x] `lib/names.ts` — `recommendNames(options)`, 성씨 + 용신/기신 + nameLength → 후보 리스트
- [x] 가중 점수: 오행 40% / 81수리 35% / 발음오행 25%
- [x] 한글 초성 추출 (`getInitialConsonant`, 쌍자음 → 평음 normalize) + 발음오행 매핑
- [x] excludeChars로 iteration 지원 (마음에 안 드는 한자 제외)
- [ ] `calcOhaengScore`/`calcSoundScore` base값 재검토 → **[39-C로 이관]**
- [ ] 부모 의도 키워드 (선택) → AI 매칭 점수 (Premium)
- [ ] 후보 30개 (Basic) / 무제한 (Premium) 생성 흐름
- [ ] iteration UX: "이 후보 마음에 안 듦" → 다른 후보로

### Task 42 — API 엔드포인트
- [x] `app/api/saju-naming/saju/route.ts` — POST: 생년월일시 → 사주 + 오행 분석 (D1 의존 없음). 0.3.0 추가. 0.6.1에서 `runtime = "edge"` 제거 (OpenNext 미지원).
- [x] `app/api/saju-naming/recommend/route.ts` — POST: 성씨 + 용신/기신 → 후보 리스트 (NAMING_DB 의존). 0.5.0 추가, 0.6.1 runtime 제거.
- [x] `app/api/saju-naming/hanja-search/route.ts` — GET: 한자 검색 (NAMING_DB 의존, 페이지네이션). 0.5.0 추가, 0.6.0 경로 평탄화, 0.6.1 runtime 제거.
- [ ] Rate limit (IP 해시, 무료 티어 보호)
- [ ] Mock D1 검증 패턴 도입 (현재는 사후 curl로 happy path 검증) — 모든 API 회귀 자동화 시 한 번에 패턴 정립

## Step 4 — 웹 UI + 결제 + 출시

### Task 43 — 랜딩 페이지 (`/naming`)
- [x] 기본 골격 (Hero, 차별점, 가격, TODO 섹션) — Task 36-A
- [ ] Gemini 환각 사례 섹션
- [ ] 후기 / 사회증명
- [ ] FAQ
- [ ] OG 이미지

### Task 44 — 무료 미리보기 흐름

> 의존: 39-B 완료 = 추천 품질 정상화 = 효능감 정상 → 44 진입 준비 완료.

- [ ] 입력 폼 (생년월일시, 성별, 음/양력, 성씨)
- [ ] 사주 결과 시각화 (8글자 그리드 + 오행 차트)
- [ ] 후보 3개 표시
- [ ] "더 보려면 Basic" 결제 유도

### Task 45 — Basic / Premium 흐름
- [ ] Stripe 결제 통합
- [ ] 후보 30개 (Basic) 화면
- [ ] AI 어감 분석 (Premium)
- [ ] 부모 의도 입력 (Premium)
- [ ] iteration 버튼

### Task 46 — 결과 저장 / 공유
- [ ] D1에 결과 저장 (선택)
- [ ] PDF 또는 이미지 export
- [ ] 공유 링크

### Task 47 — i18n
- [ ] `lib/i18n/messages.ts`에 `sajuNaming.*` namespace (ko 우선, en은 후순위)

### Task 48 — MCP 선택
- [ ] 사주 계산을 외부 MCP 노출할지 결정 (B2B 가능성)

### 별도 Task: surie/names inline 블록 분리
- [x] `lib/surie.ts` + `lib/names.ts` inline `process.exit` 검증 블록을 `poc/*-poc.test.ts` 로 분리 (Edge runtime 호환성 — `/api/recommend` 진입 전 필수). `ohaeng.ts`와 동일 패턴. **완료: `0.4.1`**

### 별도 Task: ts-node → tsx 환경 통일
- [ ] poc/ 테스트 파일 실행 환경 tsx로 통일
- [ ] `package.json` scripts에 `"test:saju": "tsx app/tools/saju-naming/poc/saju-poc.test.ts"` 추가
- 배경: Node 22 ESM + ts-node 10 호환성 문제로 `npx ts-node`가 `Cannot find module` 에러. tsx는 zero-config로 통과 (Task 37/38 검증 완료).

### Task 49 — Launch
- [ ] Stripe 라이브 모드 + webhook
- [ ] 도메인 / SEO 최종 점검
- [ ] 마케팅 카피 + 첫 캠페인
