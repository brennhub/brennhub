# C-5-7b recommend 도메인 본질 반영 + null-stroke 정확성

**Date**: 2026-05-21
**Task**: saju-naming Task 39-B C-5-7b
**Framing**: "성능 최적화"가 아니라 **사주 작명 도메인 본질(정확성)** 반영. 성능 개선은 부수 효과.

---

## 1. 정찰 — 4 findings

| # | 발견 | 영향 |
|---|---|---|
| F1 | recommend가 `WHERE inname_ok=1`만 — yongsin/gisin SQL 미반영, 전 9,460 풀 로드 | 사주 무시 추천 가능 (도메인 위배) |
| F2 | 비표준 405자(stroke NULL) 풀 포함 → 1자 이름 시 `calculateSurie`의 igyeok=`null+0`=0 → `getSurieInfo(0)` throw | recommend n=1 HTTP 500 |
| F3 | `calcOhaengScore`가 `c.ohaeng`(**음령오행**) 채점 — `calcSoundScore`(getSoundOhaeng=음령오행)와 동일 축 이중 채점. 자원오행(`ja_ohaeng`) 미사용 | "오행 40%"가 사실상 발음 점수 |
| F4 | `calculateSurie`가 `stroke`(**필획**) 사용 — 작명 81수리 정설은 **원획**(`won_stroke`) | 수리 계산 도메인 부정확 |

## 2. 재설계

### WHERE 재설계 (recommend/route.ts)
```sql
SELECT character, hangeul, stroke, won_stroke, ohaeng, meaning, frequency FROM hanja
WHERE inname_ok = 1
  AND stroke IS NOT NULL          -- F2: 비표준 405자 제외
  AND ja_ohaeng IN (?,…)          -- F1: yongsin 자원오행만 (yongsin.length>0 시)
ORDER BY frequency DESC, stroke ASC, character
LIMIT 1000                        -- O(n²) 상한 (1000²=100만)
```
- `ja_ohaeng IN (yongsin)` = 사주 결과를 추천 풀에 **본질 반영**. ja_ohaeng null인 405자 자동 제외 (`stroke IS NOT NULL`과 이중).
- yongsin/gisin은 `analyzeOhaeng`이 disjoint 보장 → `IN yongsin`이 gisin 자동 배제. (gisin은 recommendNames 내부 점수 페널티로 유지.)

### F4 — 81수리 won_stroke 전환 (lib/names.ts)
`makeCandidate`의 `calculateSurie` 입력을 `stroke`(필획) → `won_stroke`(원획)로. `HanjaEntry`에 `won_stroke` 추가. `stroke`는 display 보존. **sungStroke 입력도 성씨 원획 전제** (route docstring 명기).

### F2 안전망 — surie defensive (lib/surie.ts)
`getSurieInfo`: `key≤0`/NaN/비정수 → throw 대신 **흉(score 0)** 반환. 풀에서 이미 null-stroke 제외되나 이중 안전망 (500 회피).

### fallback
yongsin 빈 배열(균형 사주) → `ja_ohaeng` 필터 생략, `inname_ok=1 AND stroke IS NOT NULL` + LIMIT만. `analyzeOhaeng`의 "오행 균형 — 의미 중심 추천" 방향과 일관.

### hanja-search cascade
`HanjaEntry += won_stroke` → `hanja-search/route.ts`도 won_stroke SELECT 추가 (컴파일 필수). 응답에 won_stroke 노출 (additive). null-stroke/yongsin 필터는 **검색 endpoint라 미적용** — recommend(추천) 전용.

## 3. F3 — 39-C defer

C-5-7b 범위 = "recommend 작동 + 사주 필터 반영". `calcOhaengScore`가 음령오행 채점이라 `soundScore`와 중복인 문제(F3)는 **점수 가중치(오행 40%/발음 25%) 재설계**라 39-C(점수 base 튜닝)로 이관. ja_ohaeng가 SQL 필터로 승격됐으므로, 39-C에서 오행 점수 축을 자원오행 기반으로 정합화. BACKLOG 39-C flag 기록.

## 4. 검증 (로컬 — node:sqlite 004+005 적재 + route SQL + recommendNames end-to-end)

| case | pool | null-stroke | ja⊆yongsin | recommendNames | 결과 |
|---|---|---|---|---|---|
| A n=1 yongsin[수] | 1000 | 0 | ✓ | 6ms | candidates 5 |
| B n=2 yongsin[수] | 1000 | 0 | ✓ | ~1.7s | candidates 5 |
| C n=2 yongsin[목,토] | 1000 | 0 | ✓ | ~1.9s | candidates 5 |
| D n=1 yongsin[] 균형 | 1000 | 0 | — | 3ms | candidates 5 (fallback) |

- null-stroke 풀 등장 **0건** (F2 해소), ja_ohaeng 전부 yongsin (F1 해소), recommendNames throw 없음 (500 해소).
- n=2: 89M → 100만 조합, ~1.9s — Workers CPU 한도(503) 회피.
- `npm run build` TS 통과 / `poc/names-poc.test.ts` 통과 (浩 surieScore=40 — won_stroke 11 기준 확인).
- dev.brennhub.com 실 HTTP 검증은 push(dev 재배포) 후 별도 — 본 record는 로컬 end-to-end까지.

## 5. 한계 / 후속
- n=2 latency ~1.9s (CPU) + D1 로드 → 체감 ~3.5s. 기능 정상이나 추가 단축 시 POOL_LIMIT 하향(500→250k 조합) 여지.
- F3 점수 축 정합 = 39-C.
- 낙/락 다중음 검색 한계 (C-5-7a) — 별도 task 후보.
