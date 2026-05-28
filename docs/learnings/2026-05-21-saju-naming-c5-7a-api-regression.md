# C-5-7a dev preview API 회귀 + latency 측정

**Date**: 2026-05-21
**Task**: saju-naming Task 39-B C-5-7a
**전제**: 004 + 005 dev preview D1 apply 완료 (COUNT 9,460 / stroke NULL 405 / ohaeng NULL 0).
**범위**: read-only — route 확인 + dev.brennhub.com curl 회귀 + latency 실측. 코드 변경 없음.

---

## 0. 검증 환경 note — shell 한글 mangle (테스트 artifact)

명령행 리터럴 한글(한자 포함)이 git-bash(Windows, `LANG` 미설정)에서 mangle됨 → 한글 입력 API가 **거짓 실패**:
- 1차 시도: `?ohaeng=목` → HTTP 400, `?hangeul=미` → total 0, `recommend yongsin:["수"]` → 400.
- 원인 격리: ASCII-only 쿼리(`strokeMin=9`)는 정상 → DB·쿼리 무결. 한글 **입력**만 깨짐.
- 우회: URL 파라미터 = **%-인코딩 NFC** (`목`=`%EB%AA%A9` 등), POST body = **node가 생성한 NFC 바이트** (`--data-binary @-`).
→ 아래 결과는 우회 적용 후 실측. 1차 거짓 실패는 API 무관.

## 1. hanja-search — ✅ 정상

- `?hangeul=미` → total 55. **`美` = `{character:美, hangeul:미, stroke:9, ohaeng:수, meaning:"아름다울 미", frequency:3}`** — C-5-6 적재 정확 (음령오행 ㅁ→수, kTotalStrokes 9, naver verbatim meaning).
- `?ohaeng=목&strokeMin=9&strokeMax=9` → total 112, 결과 전부 `목 & 9획` ✓. `strokeMin=10&strokeMax=10` → 10획 목 ✓. 동적 WHERE + 필터 정상.
- `?hangeul=락` → total 3 (`硌·鉻·濼`), **`樂` 미포함**.
  - **낙/락 특이점 분석**: `樂`의 적재 `hangeul` = primary "낙" (C-5-2 — gov 첫 발음). `hangeul_all`([낙,락,악,요])은 004 스키마에 컬럼 없음 → 비-primary 발음으로 검색 시 누락. C-5-2 "primary 1개" 결정의 **알려진 한계** (버그 아님). 다중음 검색 필요 시 별도 task (hangeul_all 컬럼 or readings 테이블).
- 응답은 6필드(`character/hangeul/stroke/ohaeng/meaning/frequency`)만 — `won_stroke/ja_ohaeng/radical/meaning_en`은 route SELECT 미포함 → API 미노출 (노출하려면 route 변경, 본 scope 밖).
- latency ~1.6–2.1s/req (D1 count+select 왕복).

## 2. saju — ✅ 정상 (D1 무관)

`POST {year:1990,month:5,day:15,hour:9,isLunar:false}` → HTTP 200:
```
saju: 경오년 / 신사월 / 경진일 / 신사시 (lunarDate 1990-4-21)
ohaeng: balance{목0 화3 토1 금4 수0} / deficient[목,수] / excessive[화,금] / yongsin[수] / gisin[목,화,토,금]
```
D1 미사용 endpoint — regression sanity 통과.

## 3. recommend — ✗ 전건 실패 (실 regression)

| nameLength | 결과 | 시간 |
|---|---|---|
| 1 | **HTTP 500** `{"error":"Recommendation failed","code":"SERVER_ERROR","message":"Surie entry not found for 0 (mapped to 0)"}` — 5/5 실패 | 평균 1.69s / max 1.95s |
| 2 | **HTTP 503** `error code: 1102` (Cloudflare Workers 리소스 한도 초과) | 4.10s |

**원인**:
- **(a) n=1 → 500**: recommend route SELECT는 `WHERE inname_ok = 1`만 → 비표준 405자(stroke=NULL) 포함. 외자(1자) 이름의 name 한자가 null-stroke면 `calculateSurie`의 이격(元/亨/利/貞 중)이 `null+0 → 0` → 81수 테이블(1~50)에 0 없음 → `throw` → 500. recommend는 풀에 null-stroke 한자가 항상 있어 **모든 요청 실패**.
- **(b) n=2 → 503**: `recommendNames`가 `nameLength=2`에서 풀 이중 루프 = **9,460² ≈ 89,000,000 조합**, 조합마다 surie+점수 계산 → Workers CPU 한도 초과 (4.1s에서 1102).

**latency 판정**: recommend 성공(200) 0건 → 성공 latency 측정 불가. 위 수치는 **에러 응답 시간**.

## 4. C-5-7b 진입 — 필수

recommend는 현재 dev에서 **완전 작동 불가** (500/503 전건). p95 경계 판정이 아니라 hard regression → **C-5-7b 필수**. 범위는 prompt 표현 "WHERE 재설계"보다 큼:

- **(a) 정확성 — null-stroke 제외**: recommend SELECT에 `AND stroke IS NOT NULL` (비표준 405자 풀 제외; 작명 실무 가치 ≈ 0). 또는 `recommendNames`/`calculateSurie`의 null 방어.
- **(b) 성능 — pool 사전 축소**: 전 9,460 row 로드 + O(n²) 대신, yongsin 오행 / 획수 범위로 **SQL WHERE 사전 필터 + LIMIT** → `recommendNames` 입력을 수백 규모로 축소. nameLength=2 O(n²) 해소.
- 추정: 0.5d→1d (BACKLOG §C-5-7 보류 기존 추정 유효).

## 5. 종합

- hanja-search ✅ / saju ✅ — C-5-6 적재 데이터 정확성 확인 (美 spot-check verbatim 일치).
- recommend ✗ — null-stroke 충돌 + O(n²) → **C-5-7b 필수**. C-5-7b 완료 전 44 UI live(recommend 의존) 진입 불가.
- 낙/락 한계는 C-5-2 결정의 알려진 trade-off — 별도 task 후보 (다중음 검색).
