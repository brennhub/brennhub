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

### Added (C-5-5 원획법 코드화)
- `app/tools/saju-naming/lib/won-stroke.ts` — 원획법 계산 라이브러리 (C-4-B 14부수 환원표 + 숫자 한자 13자).
- `app/tools/saju-naming/scripts/build-staged-won-stroke.ts` — won_stroke 빌드 스크립트.
- `app/tools/saju-naming/scripts/data/staged-won-stroke.json` — 9,460 한자 원획 데이터.
- `app/tools/saju-naming/poc/won-stroke.poc.ts` — PoC 검증 (환원표 + 숫자 한자 룰 + 시드 25자 비교).

### Decided (C-5-5 원획법 코드화)
- 원획법 공식 = additional_strokes(kRSUnicode 잔여획) + 원획[radical_number] (14부수 한정). residual 기반 → variant detection·필획 불필요, Unihan 부수 획수 계산 방식과 무관.
- 변형 부수 환원: C-4-B 확정 14부수 표 그대로 (commit 2c3eb17 정찰 결과 인용).
- 숫자 한자 룰: 一-十 = 1-10, 百6·千3·萬15 (표면 획수 무시, 13자).
- 비표준 405자 won_stroke = null (정직 기록, C-5-6 nullable 처리).
- base 획수 = Unihan kTotalStrokes 채택. 명리학 작명 획수와 ~12% 표본 델타는 알려진 한계 (C-2/C-3 정찰에서 라이센스 안전 명리학 데이터셋 미발견 → 차선).
- C-4-B 14부수 환원 + 숫자 13자 로직은 정확 (氵 5/5 + 숫자 13 + 직접 환원 5 + seed 22/25 검증). 부정확분은 base 획수 도메인 차이, C-4-B scope 밖.

### Added (C-5-4 자원오행 매핑)
- `app/tools/saju-naming/lib/radical-ohaeng.ts` — 자원오행 214부수 매핑 (학파 plug-in 구조 + ai-default).
- `app/tools/saju-naming/scripts/build-staged-ja-ohaeng.ts` — ja_ohaeng 빌드 스크립트.
- `app/tools/saju-naming/scripts/data/staged-ja-ohaeng.json` — 9,460 한자 자원오행 데이터.
- `app/tools/saju-naming/poc/radical-ohaeng.poc.ts` — PoC 검증 (5행 분포 + 자명 부수 + plug-in 라우팅 + lib↔record 214 일관).
- `docs/learnings/2026-05-20-saju-naming-c5-4-mapping.md` — 학파 정찰 + brennhub AI 학파 입장 + 214 전건 매핑 record.

### Decided (C-5-4 자원오행 매핑)
- brennhub AI 학파(ai-default) 1차 구현 — 팩트 기반 자체 구축 (환각 X, 字源 cross-reference + 작명소 다수안 + 학술 abstract 인용 검증 가능).
- 학파 plug-in 구조 — AI 학파 + 전통 학파 Advanced 옵션 공존. 사용자 선택 가능.
- ~90 부수 학파 차이 = 학파 간 자연스러운 차이 (한계 아님, 학파 다양성).
- 향후 학파 추가 path: lib export 추가 + School union 확장 + SCHOOL_TABLES 등록 (3 step). 상세 learnings record §4.
- BACKLOG 신규 task 39-D — Advanced 전통 학파 옵션 (김기승/이재승/안태옥) 추가 path.

### Added (C-5-6 5-way join + bulk INSERT)
- `app/tools/saju-naming/scripts/build-migration.ts` — staged 4종 + 음령오행 5-way join → 005 SQL 생성 스크립트.
- `app/tools/saju-naming/migrations/004_hanja_rebuild.sql` — hanja 테이블 재생성 (stroke/won_stroke NOT NULL 제거 — 비표준 405자 수용).
- `app/tools/saju-naming/migrations/005_hanja_seed_full.sql` — 9,460 row bulk INSERT (배치 500 row/INSERT).

### Decided (C-5-6 5-way join + bulk INSERT)
- 음령오행 자모→5행 = 기존 `lib/names.ts`의 SOUND_OHAENG/getSoundOhaeng 재사용 (신규 lib X — brennhub "기존 패턴 재사용" 원칙).
- 학파 note: 훈민정음 제자해 원전 脣音(ㅁㅂㅍ)=土 / 喉音(ㅇㅎ)=水 vs 작명 실무 통용 다수안 ㅁㅂㅍ→수 / ㅇㅎ→토 swap. 기존 lib/names.ts는 통용 다수안 채택 — 본 task 계승 (자원오행과 동일 패턴: 통용 다수안 + 학파 차이 record).
- 004 재생성 — 003 자체 수정 X (이미 dev 반영). stroke/won_stroke NOT NULL 제거로 비표준 405자 충돌 해소.
- 005 bulk — 5-way join (staged-hanja + unihan + won-stroke + ja-ohaeng + 음령오행 계산), codepoint 키. node:sqlite dry-run 검증 통과.
- migration apply(004→005)는 Brenn 수동 (본 task scope 외).

### Added (C-5-7b recommend 재설계)
- `docs/learnings/2026-05-21-saju-naming-c5-7b-recommend-redesign.md` — recommend 도메인 재설계 record (4 findings + WHERE 재설계 + fallback + F3 defer + 검증).

### Fixed (C-5-7b recommend 재설계)
- recommend HTTP 500 (nameLength=1) — 비표준 405자 null-stroke가 `calculateSurie` 충돌 (igyeok=0). SQL `stroke IS NOT NULL`로 풀 제외 + `getSurieInfo` defensive (key≤0 → 흉) 이중 안전망.
- recommend HTTP 503/1102 (nameLength=2) — 전 9,460 풀 O(n²) 89M 조합 Workers CPU 초과. SQL 사전 필터 + `LIMIT 1000` → 최대 100만 조합 (로컬 ~1.9s).

### Decided (C-5-7b recommend 재설계)
- **도메인 본질**: recommend가 사주 결과(yongsin)를 SQL `ja_ohaeng IN (yongsin)`로 반영 — 사주 보완 자원오행 한자만 추천 (기존엔 점수 가중치만 → 전 풀 = 사주 무시 추천 가능했음). "성능 최적화"가 아닌 정확성 회복.
- 81수리 = `won_stroke`(원획) 기준 전환 — 작명 정설 (기존 `stroke`=필획). C-5-5 won_stroke 활용. `HanjaEntry` += won_stroke. sungStroke 입력도 성씨 원획 전제.
- fallback: yongsin 빈 배열(균형 사주) → `ja_ohaeng` 필터 생략, 의미 중심 추천 (`analyzeOhaeng` "균형" 방향 일관).
- F3 (`calcOhaengScore`가 음령오행 채점 — `calcSoundScore`와 중복) → 점수 가중치 재설계는 39-C로 defer. C-5-7b는 "사주 SQL 필터 반영" 본질까지.
- `hanja-search` route — `HanjaEntry` += won_stroke cascade로 won_stroke SELECT 추가 (응답에 won_stroke 노출, additive). null-stroke/yongsin 필터는 검색 endpoint라 미적용 (recommend 전용).

### Added (C-5-7c recommend n=2 메모리 해결)
- `docs/learnings/2026-05-21-saju-naming-c5-7c-recommend-bounded.md` — Workers 128MB 메모리 근본 원인 + bounded top-N + frequency 무효 발견 record.
- `poc/names-poc.test.ts` — case4 (bounded top-N == 전체 정렬 동등성) + case5 (대형 풀 n=2 스트레스) 추가.

### Fixed (C-5-7c recommend n=2 메모리 해결)
- recommend HTTP 503 (nameLength=2) — `recommendNames`가 pool² 후보 `NameCandidate` 배열을 전량 materialize → Workers 메모리 128MB(전 플랜 고정) 초과 OOM. bounded top-N 도입 — 순회하며 상위 topN개만 정렬 유지 → 메모리 O(topN), exact top-N (근사 아님). + `POOL_LIMIT` 1000→500 (n=2 조합 100만→25만, CPU latency 여유).

### Decided (C-5-7c recommend n=2 메모리 해결)
- n=2 503 근본 원인 = **메모리 단독** (CPU 아님). Workers 메모리 128MB는 free/paid 동일 고정 — C-5-7b "LIMIT 1000으로 CPU 안전" 가정이 메모리 한도를 누락. bounded top-N으로 pool² 배열 자체를 제거.
- `POOL_LIMIT` = 500 — n=2 조합 상한 25만 (자문 thread 200-300 권장을 500으로 정정; bounded top-N로 메모리는 이미 O(topN)이라 풀은 latency 기준으로만 결정).
- ⚠️ flag → 39-C: `frequency` 컬럼 전 row default 3 (005 적재 시 per-한자 빈도 데이터 부재) → recommend/hanja-search의 `ORDER BY frequency DESC` 무효 (실효 정렬 = stroke ASC). 빈도 정렬·다양성·점수 가중치는 39-C에서 frequency 데이터 확보 후.

### Added (C-5-8 inname_ok 정확화)
- `migrations/006_hanja_inname_ok_reconcile.sql` — 비표준 405자 `inname_ok=0` UPDATE.
- `scripts/build-staged-inname-ok.ts` + `scripts/data/staged-inname-ok-reconcile.json` — 비표준 405 식별 + staged-unihan 교차검증 + 감사 아티팩트 (405 codepoint list + criterion/출처).
- `poc/inname-ok-reconcile.poc.ts` — count·plane·교차검증·006 시뮬레이션 자동 검증.
- `docs/learnings/2026-05-21-saju-naming-c5-8-inname-ok-reconcile.md` — 정찰 전말(별표1 이미지 발견) + Option B 채택 근거 + 후속.

### Fixed (C-5-8 inname_ok 정확화)
- 9,460자 전부 inname_ok=1 (C-5-2 fallback) → 비표준 405자(plane 10/15, 유효 Unicode CJK 아님 = 출생신고 입력 불가) `inname_ok=0`. inname_ok=1 9,460→9,055. recommend는 이미 `stroke IS NOT NULL`로 405 제외 중 → 동작 변화 없음, 컬럼 의미 정합. hanja-search는 `inname_ok=1` 필터 → 비등록·null-stroke 405자 검색서 제외(정당).

### Decided (C-5-8 inname_ok 정확화)
- 정찰 결론: 권위 출처(법령 별표1 인명용추가한자표)는 한자가 BMP 이미지 7,274개로 임베드 → 기계 추출 불가. efamily는 열등 채널. 무료·기계가독 권위 코드포인트 리스트 부재 → 원안(전체 diff) 진행 불가.
- **Option B 채택** — 외부 추출 없이 데이터-검증 가능한 사실로 reconcile: `codepoint ≥ 0xA0000`(plane 10 미지정 377 + plane 15 SPUA-A 28 = 405)는 유효 Unicode CJK 범위 밖 → 보수적 제외(안전 방향: 추천 풀만 좁힘, 비등록 추천 risk 제거). 범위 == staged-unihan total_strokes=null set 교차검증.
- "9,460 vs 9,389 = 71자 초과" 정정 — 표준 CJK 9,055는 공식 9,389 대비 오히려 334자 부족, 별도로 비표준 405 보유. 71은 단순 차이일 뿐 의미 부정확.
- 후속(비critical) → 39-C: 정밀 권위 reconcile — 별표1 BMP 7,274 폰트-렌더 픽셀 매칭 + 교육용 기초한자 1,800 합집합. ~1.5~2d. Option B 안전 제외 적용 후 44 UI live 비차단.

### Added (음령오행 점수 축 정립)
- `lib/sound-ohaeng.ts` + `poc/sound-ohaeng.poc.ts` — 음령오행 plug-in 모듈 (자음 학파 tongyong/hunminjeongeum + ruleset A/B/C + 상생/상극 `relateOhaeng` + `evaluateSoundOhaeng` + 받침 브릿지).
- `docs/learnings/2026-05-21-saju-naming-sound-ohaeng.md` — 음령오행 작명 이론 정찰(출처 명시) + 설계 + 상생 방향성 정찰.

### Changed (음령오행 점수 축 정립)
- `recommendNames` 점수 재정립 — `calcSoundScore`(초성 yongsin 멤버십) → `evaluateSoundOhaeng`(성+이름 자음 오행 상생/상극, A학설 default). 가중치 **음령 55% / 수리 45%** (기존 오행40·수리35·발음25 → 2축). breakdown `음령N+수리N=T`.
- recommend route += `sungHangeul` 입력 (성씨 초성 = 음령 체인 시작점). `NameRecommendOptions` += sungHangeul / − yongsin·gisin (recommendNames 채점 미사용). `NameCandidate` − ohaengScore. Task 44 `name-recommend.tsx` cascade.

### Fixed (음령오행 점수 축 정립)
- F3 — `calcOhaengScore`가 `c.ohaeng`(음령오행) 채점 = `calcSoundScore`와 동일 축 이중 채점, 자원오행 미반영. `calcOhaengScore` 제거 — 자원오행은 recommend route SQL `ja_ohaeng IN(yongsin)` 하드 필터로 처리 (풀이 이미 걸러져 점수 축으로 또 매기면 무의미).

### Decided (음령오행 점수 축 정립)
- 자음 오행 배속 학파 — default `tongyong`(통용 다수안 = 신경준 『훈민정음운해』1750 계열), `hunminjeongeum`(해례 제자해 원전)은 plug-in. 채점 ruleset default A학설(초성만), B/C학설(종성·받침 브릿지)는 plug-in. 출처: 김만태 「훈민정음의 제자원리와 역학사상」(철학사상 2012) 등 — learnings 참조.
- 상생 채점 = **방향 무관**(다수안). 방향성 `directionBonus`는 1차 출처 확보 후 refinement plug-in (BACKLOG 39-C, 비critical).
- `RELATION_POINT`(상생 1.0/비화 0.5/상극 0.0) · 가중치 55:45 = 시작값, 최종 캘리브레이션은 39-C (풀 분포 측정).

### Added (39-C 상용도 티어 + char2 best-by-score + 작명 부적합 가드)
- `scripts/build-staged-frequency.ts` + `scripts/data/staged-frequency.json` — 상용도 `frequency` 1~5 티어 산출 (Unihan kIRG_KSource K0~K2 + 교육용 1,800). 5=교육용 / 4=K0(KS X 1001) / 3=K1 / 2=K2 / 1=그외.
- `scripts/data/edu-hanja-1800.json` — 교육용 기초한자 1,800 vendored (provenance: 교육부 고시 2000 = 사실, ko.wiktionary 부록 추출, MIT 추출기 동일 출처).
- `scripts/build-migration-frequency.ts` + `migrations/007_hanja_frequency_tier.sql` — 티어별 UPDATE (15문 / 6,763 row, 티어3=DEFAULT 3 생략). node:sqlite dry-run 분포 일치 0 mismatch. apply는 Brenn 수동.
- `lib/name-exclude.ts` — `NON_NAME_MEANING_KEYWORDS`(9)/`NON_NAME_EXPLICIT`(14)/`hasNonNameMeaning` 추가. 숫자·기능어(六全同共各一…) 차단. 풀 9,055 의미 스캔 오탐 0 검증(相·玖·鈞·申·巨 등 보호).
- `docs/learnings/2026-05-29-saju-naming-39c-frequency-tier.md` — 자료원 정찰 + 蘇 포화 병목 발견 + 3+1 레이어 + 정직한 한계 record.

### Changed (39-C 상용도 티어 + char2 best-by-score)
- `recommendNames` — 첫 글자별 cap을 **인카운터순(=stroke ASC)**으로 채우던 버퍼를 **첫 글자별 best-by-score 버킷**으로 재작성 (cap-skip 최저획 char2 잠김 → 최고점 char2 선택, 蘇玟刁의 刁=2획 고정 해소). 메모리 `O(distinct × PER_FIRST_KEEP)` 유지 — pool² 없음(c5-7c 503 원칙 계승).
- ⚠️ n=2 char2 후보 **상위 40개 제한**(`CHAR2_LIMIT`, db=route frequency DESC) — best-by-score 무제한 평가가 `evaluateSoundOhaeng`×25만으로 Workers CPU 503 재발(dev 회귀, 단건 1465ms·burst 17/20 503). char2 상위 40 제한 → CPU `O(pool×40)`≈120ms. char1은 전 풀(다양성 유지). 상세 learnings §3(B).
- `NameCandidate += freqSum` (이름 한자 상용도 합) + `compareCandidate`(totalScore desc, 동점 freqSum desc) — 상용도는 **점수 미가산**, 풀 선정(route ORDER BY frequency DESC)·동점 tiebreak에만 (음령55/수리45 축 불변).
- `poc/names-poc.test.ts` — case7(char2 best-by-score 브루트포스 동등성)·8(상용도 tiebreak)·9(작명 부적합 가드) 추가.

### Decided (39-C 상용도 티어)
- **frequency 컬럼 재사용** (스키마 변경 0) — route `ORDER BY frequency DESC`(기존, 무효였음) 즉시 유효화. 진짜 빈도 데이터 도착 시 동일 컬럼 교체.
- **상용도 프록시 = KS X 1001/1002/확장(Unihan, license-clean, 이미 캐시) + 교육용 1,800(고시 사실, license-clean)**. 한국어문회 급수(정밀)는 저작권 blocked → backlog.
- **蘇 포화 병목 발견 (계획 전제 정정)**: 성씨 蘇 원격(22) 영구 흉 → 음령 포화로 수백 조합 87 동점. frequency는 벽자만 demote, 비-작명 한자 상위 문제는 미해결 → 작명 부적합 가드(D) 추가. 그래도 일반 명사(皇革音) 잔존 = best-effort 경계, 작명 빈도/AI 어감(Task 45) 의존 backlog.

### Added (39-C 추천 품질 가드)
- `lib/name-exclude.ts` — 추천 부적합 필터 (희귀 블록 CJK URO 밖 + 부정 의미 키워드 + 명시 블랙리스트). best-effort 휴리스틱.

### Changed (39-C 추천 품질 가드)
- `recommendNames` — (1) usable 필터에 `isExcludedFromRecommend` 적용 (의미 불량·벽자·희귀 블록 제외). (2) bounded top-N → bounded 버퍼(K) + `selectDiverse`(이름 첫 글자 distinct 우선) = 추천 다양성. dev 검증 2회 관측(金犴危 / 金卵㔕 — 의미 불량·희귀자·첫 글자 중복) 해소.

### Decided (39-C 추천 품질 가드)
- frequency 실데이터 미가용 확정 — 대법원 출생 통계 = 한글 이름순위(per-name), per-한자 아님 + bulk 불가 / Unihan kFrequency = Unicode 17.0에서 제거(UAX#38 미수록). → frequency 본격 정렬은 자료 확보 의존 후속(blocked), **경량 가드** 채택.
- 희귀자 = CJK URO 밖(Ext A/B) 제외 휴리스틱 (풀 269자/3% tradeoff). 의미 불량 = 부정 의미 키워드 + 명시 블랙리스트 best-effort (완전 의미/어감 평가는 Task 45 AI 어감). 키워드는 다음절·저모호만(음·타훈 오탐 회피).
- 블랙리스트/키워드 보강 — 풀 9,055 의미(훈) 스캔 도출(추측 X): 키워드 51개(사망·질병·재앙·악/추함·범죄·요괴·부패·어리석음·궁핍·음란·태만·부정동물) + 명시 블랙리스트 24자(충돌 회피 char: 病疾疫·屎糞尿·卑庳·險嶮·鬼僞·酷暴傷 등). "거짓"(誕·眠 충돌)·"귀신"(神 충돌) 키워드는 제거하고 僞·鬼 char로 대체 — 양호자(神誕眠創低猛督便炳秉孔 등) 보호. URO 풀 제외 74→212(신규 146자). 화이트리스트(`憧` 동경할/어리석을 — 키워드 오탐 예외) 도입.

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
