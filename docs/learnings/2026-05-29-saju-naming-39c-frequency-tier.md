# 39-C 추천 품질 — 상용도 티어 + char2 best-by-score + 작명 부적합 가드

**Date**: 2026-05-29
**Task**: saju-naming 39-C 추천 품질 보완 ("흔한 한자 우선")
**계기**: prod 실사용 蘇玟刁(소민조) 추천 — 玟/玢/玪(옥 부수)·刁(거의 안 쓰는 한자)가 상위. "아무도 안 쓸 이름".

---

## 1. frequency 대용 자료원 — 정찰 + 채택

per-한자 실사용 빈도 무료·기계가독 자료는 **미가용 재확인**(대법원=per-name / Unihan kFrequency=17.0 제거 / 한국어문회 급수=저작권 blocked). → **구조적 상용도 프록시** 채택:

| 자료원 | 성격 | 라이센스 | 채택 |
|---|---|---|---|
| Unihan `kIRG_KSource` (이미 `.cache/Unihan.zip`) | KS 표준 멤버십 K0=KS X 1001 / K1=KS X 1002 / K2~=확장 | Unicode ToU (재배포 가능) | ✅ primary |
| 교육용 기초한자 1,800 (교육부 고시 2000) | 일반 문해 최상위 상용자 | 정부 고시 = 사실(비저작물). 기계가독 = ko.wiktionary 부록(고시 재현), MIT 추출기 `aliencube` 동일 출처 | ✅ top tier |
| 한국어문회 급수 (`rycont`) | 작명 포함 14등급 정밀 | "저작권 한국어문회" — open 라이센스 없음 | ❌ backlog(라이센스 확보 시) |
| 인명 빈출 한자 목록 | — | license-clean 기계가독 **부재**(정찰 확정) | ❌ backlog |

**티어 (기존 `frequency` 1~5 컬럼 재사용 — 스키마 변경 0)**: 5=교육용 / 4=K0 / 3=K1 / 2=K2 / 1=그외·미등재.
분포(9,460): `5:1791 / 4:2810 / 3:2697 / 2:1419 / 1:743`. KS-source가 작명자(珉·旼·旻 K0) 포함 + 벽자(刁 K1·玢/玪 K2) 분리 → 작명 도구 적합.
교육용 ∩ 풀 = 1,791 (풀밖 9자 = 비인명용 怒奴努農腦惱能港 + 자체 변형 晩↔晚 — tier-5 미적용, 무해).

## 2. 蘇玟刁 원인 — 그리고 **진짜 병목** (계획 전제 정정)

3요인으로 진단했으나(풀 stroke ASC 편향 / char2 cap-skip 최저획 / 의미 가드 사각), 실데이터 시뮬에서 **더 깊은 병목** 발견:

- 성씨 蘇는 원격(22획)이 영구 **흉** → 음령은 대부분 100(만점) 포화 → **수백 조합이 최고점 87 동점**.
- 蘇玟刁은 그 수백 동점 중 하나였을 뿐. **frequency tiebreak는 어느 동점이 이기는지만 바꿈.**
- 근본 = ① 점수 포화로 동점 과다 + ② 후보 풀(인명용 ∩ 자원오행)에 **비-작명 한자가 섞여 있고 알고리즘이 구분 못함**.

→ "흔한 한자 우선"은 **벽자(玟刁玢玪)는 demote했으나** "아무도 안 쓸 이름" 본질은 미해결. frequency 단독으로 안 풀림.

## 3. 적용한 3+1 레이어

| 레이어 | 위치 | 효과 | 한계 |
|---|---|---|---|
| (A) 상용도 풀 선정 | 007 migration + route `ORDER BY frequency DESC`(기존) | 풀 500이 상용자 우선 → 刁(K1)·玟玢玪 풀 상단서 demote | 풀 LIMIT 안에 비-작명 상용자 잔존 |
| (B) char2 best-by-score | `lib/names.ts` recommendNames 버퍼 재작성 | cap-skip 최저획 → 첫 글자별 **최고점** char2 (브루트포스 동등성 PoC) | 점수 포화 시 동점 다수라 가시 효과 제한 |
| (C) 상용도 tiebreak | `lib/names.ts` `freqSum` (점수 미가산) | 동점에서 흔한 한자 우선 | 비-작명 상용자(六共)도 "흔함"이라 상위 → (D) 필요 |
| (D) 작명 부적합 가드 | `lib/name-exclude.ts` | 숫자·기능어(六全同共各一…) 차단 | best-effort·비포괄: 일반 명사·동사(皇革音列式吏…) 미포착 |

**(B) 메모리 + CPU**: 첫 글자별 bounded 버킷 `O(distinct × PER_FIRST_KEEP)` — pool² materialize 없음(메모리 503 회피, c5-7c 계승).
- ⚠️ **CPU 503 재발 → 정정**: 첫 시도는 cap-skip 제거 후 **전 조합**(POOL 500 → n=2 25만) 평가. c5-7c는 cap-skip+경량 `calcSoundScore`로 25만이 193ms였으나, 그 후 도입된 **`evaluateSoundOhaeng`이 ~7.6× 무거워** 25만 = 단건 1465ms + 순차 burst에서 17/20 HTTP 503(dev 회귀). Workers CPU 한도 초과.
- **수정**: n=2 char2 후보를 **상용도 상위 40개**로 제한(`CHAR2_LIMIT=40`, db는 route frequency DESC 정렬 = 상위가 상용 char2). char1은 전 풀 순회(첫 글자 다양성). CPU `O(pool × 40)` ≈ 2만 ≈ 120ms(c5-7c 안전역). best-by-score는 상위 char2 집합 안에서. POOL 500은 유지(seed 25 < 40이라 PoC case7 브루트포스 동등성 불변).
- 교훈: **Workers 회귀는 로컬 PoC로 안 잡힘** — `evaluateSoundOhaeng` 같은 점수 함수 무게 변화 시 조합수×함수무게를 dev HTTP latency로 재측정 필수. c5-7c 193ms는 당시 경량 함수 기준이라 현재 무효.

**(D) 가드 — 오탐 0 데이터 검증** (풀 9,055 의미 스캔). 충돌 어휘는 키워드 배제 + char 명시:
- 키워드(9): 여섯·다섯·여덟·일곱·스물·한가지·각각·온전할·무릇 → 매칭 18자(七五仝伍全八六凡卄各同咫囫廿捌柒漆鍰, 전부 비-작명).
- 명시 char(14): 一二三四九十卅(수사) + 共又亦咸皆此其(기능어).
- 보호(미차단): 相(서로)·玖(옥돌/아홉)·鈞(서른근)·申·巨(클)·宜·當·至·致·早·萬·千·百·升 — "아홉/서른/온전/어찌/마땅/이를/단위" 키워드 배제로 보존.

## 4. 蘇 추천 시뮬 (before/after, 실데이터 join)

| | yongsin 금 top5 |
|---|---|
| prod before | 蘇玟刁 (玟 K0 / 刁 K1 sly / 玢玪 K2 벽자) |
| after (A+B+C+D) | 蘇皇列·蘇負式·蘇革列·蘇音列·蘇譜珍 (전부 87 동점) |

**정직한 결론**: 벽자(玟刁玢玪)·숫자/기능어(六全同共)는 사라졌으나, **점수 포화 + 비-작명 명사(皇革音列式吏)** 잔존으로 蘇 추천은 여전히 작명 품질 낮음. 이는 작명-특화 빈도(한국어문회 라이센스 / 인명 빈출 큐레이션) 또는 AI 어감(Task 45) 의존 = backlog. 본 task는 **벽자·기능어 제거 + 상용도 인프라 구축**까지의 부분 개선.

## 5. 산출물

- `scripts/build-staged-frequency.ts` + `scripts/data/staged-frequency.json` (티어) + `scripts/data/edu-hanja-1800.json` (vendored, provenance).
- `scripts/build-migration-frequency.ts` + `migrations/007_hanja_frequency_tier.sql` (UPDATE 15문 / 6,763 row. node:sqlite dry-run: 분포 일치 0 mismatch). **apply는 Brenn 수동.**
- `lib/names.ts` — `NameCandidate.freqSum` + `compareCandidate`(점수 desc, 동점 freqSum desc) + 첫 글자별 best-by-score 버퍼.
- `lib/name-exclude.ts` — `NON_NAME_MEANING_KEYWORDS` / `NON_NAME_EXPLICIT` / `hasNonNameMeaning`.
- `poc/names-poc.test.ts` — case7(char2 best-by-score 브루트포스)·8(tiebreak)·9(작명 부적합 가드) 추가.

## 6. 후속 (backlog)

- **작명 품질 본질** — 비-작명 명사 잔존. 작명-특화 신호(한국어문회 라이센스 확보 / 인명 빈출 큐레이션) 또는 Task 45 AI 어감으로 해소. frequency 티어는 그 데이터 도착 시 즉시 교체 가능한 인프라.
- 성씨별 수리 포화(蘇 원격 흉 고정) — 점수 분포 캘리브레이션(39-C base 튜닝)에서 동점 완화 검토.
