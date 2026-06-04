# saju 명리 엔진 격상 — Step 1 데이터 출처 정찰

**Date**: 2026-06-04
**Task**: `SAJU_ENGINE_PLAN.md` Step 1 — 데이터 출처 license/정밀도/기계가독 정찰 (read-only, 코드 0줄)
**Outcome**: 코드 현황 정정 2건 확정 + 데이터 출처별 가용성/리스크 정리 + Step 2 진입 폭 권고

---

## 0. 한 페이지 요약

| 영역 | 자료 확보 가능성 | 코어 라이센스 | 격상 폭 권고 |
|---|---|---|---|
| **절기 시각** (분 단위) | ✅ KASI OpenAPI(인증키 호출) / 🟡 `distbe/holidays`(정적 JSON, KASI 출처, **license 미명시 → 정찰 마무리 필요**) | 공공데이터 (KOGL 1~3 유형 확인 필요) | 🟢 즉시 진입 가능 |
| **균시차** | ✅ NOAA 표준 천문 공식 (사실, 저작권 비대상) | clean | 🟢 즉시 |
| **서머타임** | ✅ 위키 검증 정적 테이블 (사실) | clean | 🟢 즉시 |
| **지장간 표** | ✅ 표준 명리학 자료 (사실, 학파 차이 적음) | clean | 🟢 즉시 |
| **합충형해형** | ✅ 표준 명리학 표 (사실) | clean | 🟢 즉시 |
| **신살 조견표** | ✅ 표준 + 일부 학파 차이 (자원오행 plug-in 패턴 적용 가능) | clean | 🟡 학파 채택 결정 필요 |
| **억부 용신** | ✅ 표준 알고리즘 (득령·득지·득세) | clean | 🔴 사용자 대면 영향(추천 변동) 결정 항목 |
| **부행 split_type** | ⚠️ `cjkvi/cjkvi-ids` URO 데이터 **GPLv2**(전염 위험) / `amake/cjk-decomp` 미확인 / Unihan `kIDS` **미수록**(2025-07-24 cache 0건, Unicode 17.0 제안만) / 부수에서 부분 유도 가능 | **부분 blocked** | 🟡 단계적, 라이센스 안전 출처 추가 정찰 |
| **81수리 유파** | ✅ 표 자체는 사실 / 현 `surie.ts` 채택 유파 미명시 | clean | 🟡 권위 출처 cross-ref 후 docstring 출처 박기 |

**가장 큰 리스크**: 부행 split_type (URO GPL 위험). 그 외 영역은 license-clean 자료로 진입 가능.

---

## 1. 코드 현황 정정 (in-repo 확인)

플랜 §3의 **사실 오류 2건** 정찰로 확정 + 추가 정정 사항 발견.

### 1.1 용신/희기신 — **단순 카운트** (억부 아님)

`app/tools/saju-naming/lib/ohaeng.ts:7-12` docstring:
```
용신/기신 결정 규칙 (단순화):
  1. deficient(== 0) 오행 → 직접 용신
  2. deficient를 상생해주는(생기는 쪽) 오행 → 용신 (간접 보완)
  3. excessive(≥ 3) 오행 → 기신
  4. excessive를 상생해주는 오행 → 기신 (강화하므로 피함)
  5. 충돌 시 기신 우선
```
- **억부법 미구현**: 일간 강약(득령·득지·득세) 산정 0줄.
- **조후법 미구현**: 월령 한열조습 0줄.
- 격상 시 yongsin/gisin 결과가 달라져 작명 추천 풀이 변동됨 → **사용자 대면 결정 항목**.

### 1.2 합충형해형 — **0% 미시작** (부분 아님)

`app/tools/saju-naming/lib/` 전체 grep:
- 키워드 "충/沖/형/刑/파/破/해/害/원진/怨嗔/합/合" — 코드 전무.
- 어떤 합충 함수도 export되지 않음. 플랜의 "부분✅" 표기는 사실 오류.

### 1.3 추가 발견 — 시주/자정/시간 미지 처리

`saju.ts:130-155` 확인:
- 23시 → 子時(0) 처리 코드 존재 ✓ (`if (hour === 23) return 0`).
- BUT **일주 교차 미처리**: 23시 출생이면 일주는 다음 일주가 되어야 하는데(자시생), 현재는 같은 양력 날짜로 일주 계산. BACKLOG에 "자정 경계 (Phase 2)" 명시로 인지는 됨.
- **`hour ?? 0`**(line 216): 시간 미지(unknown birth hour) 입력 시 子時 기본값으로 처리 → 결정론적이나 의미적으로 부정확. 격상 시 "시간 미지" 명시 처리 필요.

### 1.4 81수리 — 채택 유파 출처 미명시

`surie.ts` docstring에 채택 유파 표기 0. 분포는 `대길 6 / 길 21 / 반길 6 / 흉 17` (총 50, 51+ 순환). 어느 권위 출처(熊崎健翁 원전 / 한국 표준 작명서)와 일치하는지 미확인 — 격상 단계에 cross-ref 후 출처 docstring 추가 필요.

### 1.5 절기 시각 — 라이브러리 미제공

`lib/vendor/korean-lunar-calendar.d.ts` 확인 — API는 `setSolarDate/setLunarDate/getGapja` 만. 60갑자(년·월·일) day-level만 제공, **절기 시각/입춘 시각 API 없음**. 연주 입춘 기준 처리는 라이브러리 내부 테이블에 정적으로 묻혀 있을 가능성(분 단위 정밀도 불명) — 명시적 절기 시각 데이터 별도 확보 필요.

---

## 2. 데이터 출처별 조사 (a~f)

### 2a. 절기 데이터

**현 시스템**: 미구현 (라이브러리 day-level 60갑자만, 분 단위 절입 시각 X).

**후보 출처**:

| 출처 | 형식 | 정밀도 | 라이센스 | 평가 |
|---|---|---|---|---|
| **KASI 특일 정보 OpenAPI** (data.go.kr/15012690) | JSON, `HH:mm` | 분 단위 ✓ | 공공데이터 (KOGL 유형 확인 필요), 인증키 발급제 | 🟡 정확하나 **호출 의존 = brennhub 결정론 원칙 손상** — 정적 vendor 필요 |
| **distbe/holidays** (GitHub) | `{year}.json`, `HH:mm` | 분 단위 ✓ (KASI 재가공) | **미명시 ⚠️** — repo 정찰로 license 파일 부재 확인 | 🟡 형식·정밀도·자동 갱신 모두 적합, **license 정찰 마무리(maintainer 문의 or repo Issue) 필수** |
| **KASI astro.kasi.re.kr 월력요항** | PDF/HTML | 미확인 | 공공저작물 가능성 | 🟡 정적 자료원 — 분단위 분석 필요 |

**권장**: KASI OpenAPI를 한 번 호출하여 1900~2100 절기 시각 정적 JSON으로 build script로 vendor (Unihan과 동일 캐시 패턴). 호출 자체는 build-time 1회, runtime은 vendored JSON만 사용. 라이센스 = KOGL 1유형 확인 시 가능 (출처 표기 의무).

**🔴 필수 정찰 마무리**: data.go.kr 특일 정보 OpenAPI의 정확한 라이센스 유형 (KOGL 1~4) 확인 후 vendor 절차 결정.

### 2b. 부행 split_type (가장 큰 리스크)

**목표**: 9,460자 가로(⿰)/세로(⿱)/기타 구조 분류 → 작명 필터(쪼개짐 배제) 입력.

**후보 출처 + 라이센스 위험**:

| 출처 | 커버리지 | 라이센스 | 평가 |
|---|---|---|---|
| **Unihan `kIDS`** (Unicode 표준) | 모든 CJK 예정 | Unicode ToU (재배포 가능) | **🔴 미수록**: 우리 캐시(`Unihan.zip` 2025-07-24)에 `kIDS` 0건 grep. Unicode 17.0 제안 (L2/21-118R)만 통과, 실데이터 미배포 |
| **cjkvi/cjkvi-ids `ids.txt`** (URO+Ext A·B) | URO 포함 (우리 풀 거의 전체 커버) | **GPLv2** ⚠️ (CHISE 출처 — Taichi Kawabata 유지) | **❌ 라이센스 risk**: GPL 전염으로 brennhub 전체 GPL 감염 우려 → 우리 풀 거의 못 쓰는 셈 |
| **cjkvi/cjkvi-ids `ids-ext-cdef.txt`** | Ext C·D·E·F 한정 | GPL 무관 | ❌ URO 미포함 → 우리 풀 거의 무익 |
| **amake/cjk-decomp** | 75,000 CJK | **미확인** | 🟡 license 정찰 필요 (정밀 fetch 추가) |
| **부수에서 유도** | 부분 (좌우/상하 부수가 부분 정보 제공) | clean (Unihan kRSUnicode 사용) | 🟡 단계적: 좌우 부수(예: 氵·亻·扌)는 ⿰ 구조 강함 → 부분 자동 분류 가능. 정밀도/리콜은 제한 |

**현실적 권장**:
- 1단계: 부수 기반 부분 유도(Unihan kRSUnicode 활용, license-clean)로 ~50% 정도 자동 분류.
- 2단계: amake/cjk-decomp license 정찰 + 안전하면 보강.
- 3단계: 정확도 미흡 시 split_type 필터 자체를 **선택 옵션(미가동 default)**으로 → C-5-2 fallback 패턴 계승.
- **🔴 자료 미가용 시 부행 필터는 미구현 보류** — 작명 본기능에 영향 없음.

### 2c. 신살 조견표

**현 시스템**: 미구현.

**후보 출처**:

| 출처 | 신살 종류 | 라이센스 | 평가 |
|---|---|---|---|
| **명리학 표준 (KCI 논문 / 명리심리상담사 교안 / 위키백과)** | 천을귀인·문창·역마·도화·괴강·백호 등 표준 | 표 자체 = 사실 (저작권 비대상) | 🟢 cross-ref 후 자체 매핑 표 작성 (자원오행 C-5-4 패턴) |
| **hjsh200219/fortuneteller** (GitHub MCP server) | 15개 신살 구현 참고 | 미확인 | 🟡 참고 구현체 — 라이센스 정찰 |

**학파 차이**: 신살 자체 정의는 표준이나 일부 신살(예: 백호대살)은 학파별 미세 차이. **자원오행 C-5-4 plug-in 패턴 그대로 적용 가능** — 다수안 default + 학파 옵션.

**권장**: 우선 표준 신살(천을귀인·문창·역마·도화·괴강 등 핵심 6~10개) 자체 매핑 + 권위 출처 docstring 명시. license-clean.

### 2d. 균시차 (Equation of Time)

**현 시스템**: 미구현.

**자료**: **NOAA 표준 천문 공식** (Spencer 1971 또는 NOAA Solar Calculator 공식). 1년 ±16분 진폭. 천문/수학 공식 = 저작권 비대상.

**구현**: 순수 수학 함수, Edge 호환. 외부 의존성 0. license-clean.

**권장**: 진태양시 변환 시 `(경도 보정 + 균시차)` 함수로 즉시 구현 가능.

### 2e. 81수리 길흉표 채택 유파

**현 시스템**: `surie.ts` 50개 등급 분포 `대길 6 / 길 21 / 반길 6 / 흉 17`. 채택 유파 출처 docstring 0.

**역사**: 일본 **熊崎健翁(구마자키 켄오) 五格剖象法** (1920년대 후반), 한국 1940년 창씨개명기 이후 유입. 현재 한국 작명의 주류 수리법. ([KCI 논문 ART001877942](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001877942))

**현실**: 한국 작명 사이트마다 길흉 등급 미세 차이 존재 (대길/길 경계 일부 자리, 반길 적용 자리 등).

**권장 (격상 단계 제출)**:
1. 권위 출처 cross-ref: 熊崎健翁 원전 또는 한국 표준 작명서(여러 권) 표 입수.
2. 현 `surie.ts` 50개 등급을 권위 표와 대조 → 일치/차이 매핑 (자원오행 C-5-4 패턴).
3. 일치하지 않는 자리는 docstring에 명시 + 다수안 채택. 학파 옵션 plug-in 가능.

### 2f. 지장간 표

**현 시스템**: 미구현 (오행 카운트는 천간·지지 직접 매핑만, 지장간 가중 0).

**자료**: 명리학 표준 (사실, 학파 차이 적음).
- **생지(인·신·사·해)**: 여기 7일 / 중기 7일 / 본기 16일
- **왕지(자·오·묘·유)**: 여기 10일 / 본기 20일 (오화 예외: 중기 기토 9일 + 본기 정화 11일)
- **고지(진·술·축·미)**: 여기 9일 / 중기 3일 / 본기 18일

**출처**: 위키백과(CC BY-SA) / KCI 논문(ART002596264) / 명리심리상담사 교안 PDF — cross-ref 일관.

**권장**: 12지지 × {여기·중기·본기 천간 + 일수} 정적 테이블 자체 작성, 출처 cross-ref docstring. license-clean.

---

## 3. Step 2 진입 폭 권고

자료 가용성 × 사용자 영향 × 라이센스 위험으로 정렬.

### 즉시 진입 가능 (자료 license-clean + 알고리즘 표준 + 사용자 영향 작음)

1. **균시차 + 경도 보정 + 서머타임 테이블** (saju.ts 진태양시 격상). 사용자 영향: 출생 분 단위 시주가 일부 변동 — 정확성 향상.
2. **지장간 표 도입** (ohaeng.ts 가중 점수). 사용자 영향: 오행 카운트가 가중치 기반으로 바뀌어 일부 케이스 yongsin 변동.
3. **합충형해형 표** (B 분석 + D 택일 공통). 사용자 영향 0(신규 출력).
4. **81수리 유파 cross-ref + docstring 출처 박기**. 사용자 영향 0(설명 보강) — 격상 후 일부 등급 변동 가능.

### 자료 정찰 마무리 후 진입

5. **절기 시각 vendor** — KASI OpenAPI 라이센스 유형 확인 + distbe/holidays license 정찰 후. 정찰 결과에 따라 build script + 정적 JSON.
6. **신살 조견표** — 표준 신살 6~10개 자체 매핑 + 학파 옵션 plug-in 패턴.

### 신중 진입 (사용자 대면 영향 큼)

7. **억부 용신 격상** (단순 카운트 → 일간 강약 + 억부 + 조후). 사용자 영향: **yongsin/gisin 결과 변동 → 추천 결과 직접 변경**. 명시적 사용자 공지/마이그레이션 정책 결정 필요.

### 자료 위험 — 별도 정찰 후

8. **부행 split_type** — cjkvi-ids GPL 회피 + amake/cjk-decomp license 확인 + 부수 유도 가능성 검토. 미가용 시 보류 정책.

### A·B 격상 후 진입

9. **대운 + 세운** — 절기 시각 데이터 의존.
10. **택일 엔진 D** — A·B 코어 격상 후.

---

## 4. 후속 (Step 2 진입 시 정찰서 갱신)

- KASI OpenAPI KOGL 유형 확인 결과
- distbe/holidays license 확인 (maintainer 문의)
- amake/cjk-decomp license 확인
- 熊崎健翁 81수리 원전 vs surie.ts 표 cross-ref 결과
- 신살 학파 차이 정찰 (자원오행 C-5-4 패턴 적용 폭)

---

## 부록: 본 정찰서 출처

- KASI Open API: [공공데이터포털 15012690](https://www.data.go.kr/data/15012690/openapi.do) / [astro.kasi.re.kr/information/pageView/31](https://astro.kasi.re.kr/information/pageView/31)
- distbe/holidays: [GitHub distbe/holidays](https://github.com/distbe/holidays)
- cjkvi/cjkvi-ids: [GitHub cjkvi/cjkvi-ids](https://github.com/cjkvi/cjkvi-ids) / IDS 저작권 우려 [L2/21-118R 부속서](https://www.unicode.org/L2/L2021/21161-ids-copyright.pdf)
- Unihan UAX #38: [unicode.org/reports/tr38](https://www.unicode.org/reports/tr38/) (kIDS는 17.0 제안만, 실데이터 미배포)
- 81수리 일본 기원: [KCI ART001877942](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART001877942) "창씨개명 시기에 전파된 일본 성명학(姓名學)의 영향"
- 지장간 표: [KCI ART002596264](https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=ART002596264) "명리학에서 지장간의 천간 구성과 일수 배속 고찰" / [위키백과 지장간](https://ko.wikipedia.org/wiki/%EC%A7%80%EC%9E%A5%EA%B0%84)
- IDS / IDC: [IDS 위키](https://en.wikipedia.org/wiki/Chinese_character_description_languages) / [나무위키 한자 모양 설명 문자](https://namu.wiki/w/%ED%95%9C%EC%9E%90%20%EB%AA%A8%EC%96%91%20%EC%84%A4%EB%AA%85%20%EB%AC%B8%EC%9E%90)
