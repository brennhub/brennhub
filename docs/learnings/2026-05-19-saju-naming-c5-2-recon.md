# C-5-2 데이터 소스 정찰 보고서

**Date**: 2026-05-19
**목적**: C-5-2 (rutopio gov+naver 적재 스크립트 + 9,443↔9,389 reconcile) 자문 thread 입력용 사실 데이터.
**범위**: read-only. 코드/스크립트/migration 변경 없음.

---

## 1. 기존 정찰 record 재확인 — ⚠️ 수치 정정

- 경로: `docs/learnings/2026-05-19-saju-naming-task-39b-recon.md` (존재 확인).
- 본 정찰에서 **robust CSV 파싱**(따옴표·콤마 처리)으로 재계산한 결과, recon record 수치가 소폭 어긋남:

| 항목 | recon record | robust 재실측 | Δ |
|---|---|---|---|
| gov 고유 한자 | 9,443 | **9,460** | +17 |
| naver 고유 한자 | 8,095 | 8,095 | 0 |
| 교집합 (한국어 의미 보유) | 7,945 | **7,960** | +15 |
| gov-only (한국어 의미 없음) | 1,498 | **1,500** | +2 |
| gov-only 중 영어(`kDefinition`) 보유 | 612 | **613** | +1 |
| 의미 전무 (한·영 모두 없음) | 886 | **887** | +1 |
| 공식 인명용 한자 | 9,389 | 9,389 (README 확인) | 0 |

- **원인**: 이전 C-2 스크립트가 gov CSV의 hanja를 고정 컬럼 index `c[3]`로 추출. gov는 복수음 한자의 `hangul` 필드를 `"낙,락,악,요"`처럼 **따옴표+콤마**로 저장 → 콤마 split 시 컬럼 밀림. 읽기 3개 이상인 한자 18자(3음 15 + 4음 3)에서 `c[3]`이 엉뚱한 필드를 가리킴.
- **영향**: 오차 ~17자 (0.18%). D안 결정·Part 1 벽자 분석 결론은 불변. 단 정확한 적재를 위해 **C-5-2 스크립트는 반드시 따옴표 처리하는 CSV 파서 사용** (naive `split(",")` + 고정 index 금지).
- 정정 후 추천 대상(의미 보유) = 교집합 7,960 + 영어전용 613 = **8,573** (recon "8,557" → 정정).

---

## 2. 데이터 소스 파일 위치

| 소스 | repo 내 위치 | 외부 위치 | 라인 수 | 라이센스 |
|---|---|---|---|---|
| rutopio gov | **없음** | `rutopio/Korean-Name-Hanja-Charset` → `data-gov.csv` | 10,164 (헤더 1 + 10,163 데이터) | MIT |
| rutopio naver | **없음** | 동 repo → `data-naver.csv` | 8,958 (헤더 1 + 8,957 데이터) | MIT |
| Unihan | **없음** | `unicode.org/Public/UCD/latest/ucd/Unihan.zip` (8.5MB) | — | Unicode ToU |

- repo 전체에 `*.csv` **0건**, `scripts/` 폴더 **없음**. 세 소스 모두 외부 — C-5-2 적재 스크립트가 fetch 또는 로컬 캐시.
- rutopio raw URL: `https://raw.githubusercontent.com/rutopio/Korean-Name-Hanja-Charset/HEAD/data-{gov,naver}.csv`
- rutopio README 확인: "Hanja character in dataset **has not yet been deduplicated**" — 데이터셋에 중복 row 존재 명시.

---

## 3. CSV 컬럼 구조

### rutopio gov (`data-gov.csv`)

컬럼: `hangul, consonant, unicode, hanja`

```csv
hangul,consonant,unicode,hanja
가,ㄱ,04f3d,伽
가,ㄱ,04f73,佳
가,ㄱ,05047,假
```

- `unicode`: 5자리 hex, 0-padding 소문자 (`04f3d`).
- `hanja`: 실제 한자 글자 (항상 마지막 필드, 콤마 없음 → robust 추출 가능). hex 문자열로 저장된 row **0건** (robust 파싱 기준).
- **공식 인명용/비인명용 구분 컬럼 없음** (4컬럼뿐).

### rutopio naver (`data-naver.csv`)

컬럼: `hangul, consonant, unicode, hanja, meaning, id`

```csv
hangul,consonant,unicode,hanja,meaning,id
가,ㄱ,53ef,可,옳을 가,d8ace440ebc04c8c9af8eb8c13e90baa
가,ㄱ,5bb6,家,집 가,80617961bdc7429fafbaf1287390b271
가,ㄱ,4f73,佳,아름다울 가,1d4f7c8d2b0e48908b2f39f8d4dde3b4
```

- `unicode`: hex, 0-padding 없음 (`53ef`, `6a02`). gov(5자리 padding)와 형식 다름 → join 시 정수 변환 필요 (003 `codepoint INTEGER`).
- `meaning`: 한국어 훈+음 (`옳을 가`).
- `id`: hex 해시 (한자 단위, 복수음 row 간 공유).

---

## 4. 음 복수 케이스 (verbatim)

### gov — 같은 한자가 N개 row로 중복, hangul 필드에 전체 읽기 콤마 join

```csv
"낙,락,악,요",,06a02,樂      ← 4개 row 동일 (line 1512, 2054, 4929, 5954)
"도,탁",,05ea6,度            ← 2개 row 동일 (line 1825, 8782)
"복,부",,05fa9,復            ← 2개 row 동일 (line 3456, 3542)
"역,이",,06613,易            ← 2개 row 동일 (line 5313, 6654)
"항,행",,0884c,行            ← 2개 row 동일 (line 9332, 9397)
```

### naver — 읽기마다 별도 row, 읽기별 meaning

```csv
낙,ㄴ,6a02,樂,즐길 락(낙),cc08eb8e860c4ca793aca3f7cb393cdd
락,ㄹ,6a02,樂,즐길 락(낙),cc08eb8e860c4ca793aca3f7cb393cdd
악,ㅇ,6a02,樂,노래 악,cc08eb8e860c4ca793aca3f7cb393cdd
요,ㅇ,6a02,樂,좋아할 요,cc08eb8e860c4ca793aca3f7cb393cdd
복,ㅂ,5fa9,復,회복할 복,b2d26cd0a3db47d696f928606dff95c7
부,ㅂ,5fa9,復,다시 부,b2d26cd0a3db47d696f928606dff95c7
```

### 패턴 분석

- **gov**: 복수음 한자 = `hangul` 필드에 모든 읽기를 `"낙,락,악,요"`로 콤마 join + 따옴표. `consonant` 필드는 복수음 row에서 **비어있음**. 같은 한자가 그 읽기 수만큼 (또는 그 이하) **완전 동일 row로 중복** 등장. 등장 횟수 분포: 1회 8,778 / 2회 664 / 3회 15 / 4회 3 (고유 9,460).
- **naver**: 복수음 한자 = 읽기마다 **별도 row**, 각 row에 **읽기별 meaning** (樂: 락="즐길 락(낙)", 악="노래 악", 요="좋아할 요"). `id`는 한자 단위로 동일.
- **C-5-2 함의**: 003 스키마는 `character UNIQUE` + 단일 `hangeul` + 단일 `meaning`. 한자당 1 row로 접어야 함 →
  - `hangeul`: gov의 콤마-join을 그대로 쓸지(`락,낙,악,요`) vs 대표음 1개 선택.
  - `meaning`: naver는 읽기별로 의미가 다름 → 대표 1개 vs 전체 join. (자문 thread 결정 사항.)

---

## 5. 9,460 vs 9,389 reconcile

- recon record는 "9,443 vs 9,389 → 54자 차이, crawl 잡음 추정"으로 기재. 본 정찰의 robust 재실측에서 gov 고유 = **9,460** → 공식 9,389 대비 **+71자** (54 아님).
- **gov CSV에 "공식 인명용" 플래그 컬럼 없음** — 4컬럼(`hangul,consonant,unicode,hanja`)뿐. gov 데이터만으로 71자 reconcile 불가.
- 공식 9,389 출처 (rutopio README 확인):
  - 2024년 6월 대법원이 인명용 한자를 **8,319 → 9,389** 확대 (+1,070자, 대법원규칙 제3151호).
  - 권위 소스: **대한민국 법원 전자가족관계등록시스템** `https://efamily.scourt.go.kr/cs/CsBltnWrtList.do?bltnbordId=0000010`.
  - (참고: 002 시드 주석의 "8,142자"는 stale — README의 pre-2024 공식치는 8,319. 어느 쪽이든 현재 9,389이 확정치.)
- gov 중복 row는 이미 처리됨: 10,163 데이터 row → 따옴표 처리 후 9,460 고유. README의 "not deduplicated"는 **row 중복**(10,163 중 1,385 복수음 row) 얘기 — 고유 한자 71자 초과와는 별개.
- 71자 초과 후보 원인 (미검증): 이형자/호환 코드포인트가 별도 글자로 카운트, 또는 crawl 시 동일 한자의 변이체 수집. **gov CSV 단독으로 판정 불가** → 막힌 부분 (§종합 참조).

---

## 6. scripts 폴더 구조

- `scripts/` 폴더 **없음** (repo 전체 검색 0건).
- 다른 도구의 데이터 처리: migration SQL을 `app/tools/<tool>/migrations/`에 colocate (saju-naming: `001/002/003`, supp-plan 동일 패턴). **별도 데이터 변환 스크립트 선례 없음** — saju-naming의 PoC는 `app/tools/saju-naming/poc/`에 colocate.
- **적재 스크립트 위치 제안**: `app/tools/saju-naming/scripts/` (migrations·poc와 같은 도구 폴더 colocate, AGENTS.md "문서 colocate" 원칙 일관). 루트 `scripts/`는 선례 없어 신규 최상위 폴더 도입 — 유지보수성 원칙상 도구 폴더 내 colocate가 자연.

---

## 종합

### 자문 thread 결정 입력

1. **수치 정정**: robust 파싱 기준 gov 9,460 / 교집합 7,960 / gov-only 1,500 / 추천 대상 8,573. recon record(9,443/7,945/1,498/8,557)는 CSV 파싱 버그로 ~17자 오차 — 결론 불변이나 003 적재는 정정치 사용.
2. **CSV 파서 필수**: gov의 복수음 row는 `hangul` 필드가 따옴표+콤마. C-5-2 스크립트는 따옴표 처리 CSV 파서 사용 (naive split 금지). hanja는 항상 마지막 필드.
3. **음 복수 접기 정책**: gov는 한자당 N개 동일 row + hangul 콤마-join, naver는 읽기별 row + 읽기별 meaning. 003은 한자당 1 row → `hangeul`(대표음 vs join), `meaning`(대표 vs join) 정책 결정 필요.
4. **codepoint 정규화**: gov `unicode`는 5자리 0-padding, naver는 padding 없음. join key는 정수 변환(`parseInt(hex,16)`) 후 비교 — 003 `codepoint INTEGER`와 일관.
5. **적재 스크립트 위치**: `app/tools/saju-naming/scripts/` 제안.

### 막힌 부분 (정찰만으로 결론 불가)

- **항목 5 — 9,460 vs 9,389 reconcile**: gov CSV에 공식 인명용 플래그가 없어 71자 초과분을 데이터만으로 특정 불가. 해소하려면 (a) `efamily.scourt.go.kr` 권위 리스트를 별도 확보해 대조, 또는 (b) gov 9,460을 공식 9,389의 상위집합으로 간주하고 초과 71자를 `inname_ok` 등으로 구분 없이 전량 적재(D안 "전량 적재" 정신과 일관) — 자문 thread 결정 필요.
- 71자 초과 원인(이형자/호환 코드포인트 의심)은 Unihan `kCompatibilityVariant`/`kZVariant` 대조로 일부 규명 가능하나, 공식 리스트 없이는 완전 reconcile 불가.
