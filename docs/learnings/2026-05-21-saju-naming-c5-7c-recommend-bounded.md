# C-5-7c recommend n=2 메모리 503 — bounded top-N

**Date**: 2026-05-21
**Task**: saju-naming Task 39-B C-5-7c
**Framing**: "성능 최적화" 아님. n=2 HTTP 503의 **근본 원인은 Workers 메모리 한도** — C-5-7b가 CPU만 보고 메모리를 누락한 것의 정정.

---

## 1. 근본 원인 — 메모리 단독

C-5-7b는 n=2 503을 "O(n²) CPU 초과"로 진단하고 `LIMIT 1000`(100만 조합, 로컬 ~1.9s)으로 CPU 안전을 확보했다고 판단. dev 재배포 후 n=2가 **여전히 503** — 진단 미스.

| 항목 | 값 | 한도 |
|---|---|---|
| CPU (n=2, 100만 조합) | 로컬 ~1.9s | Workers paid 수십초 — **여유** |
| 메모리 (pool² `NameCandidate` 배열) | 100만 객체 materialize ≈ 수백 MB | Workers **128MB** — **초과 → OOM 503** |

- Workers 메모리 **128MB는 free/paid 동일 고정값** (CPU와 달리 플랜·`wrangler.jsonc`로 못 올림). C-5-7b 자문이 "paid는 메모리도 큼"으로 오인 → 정정.
- `recommendNames`가 pool²개 `NameCandidate`를 배열에 **전량 push 후 `sort` → `slice(topN)`**. 100만 객체(각 hanja/strokes/ohaengList/breakdown…) = 메모리 폭발. 원인은 조합 수가 아니라 **조합을 전부 메모리에 들고 있는 것**.

## 2. 해결 — bounded top-N

`recommendNames` 조합 루프를 재작성 — pool² 배열을 만들지 않고 순회하며 **상위 topN개만** 정렬 유지.

```ts
const limit = options.topN;
const top: NameCandidate[] = [];
function consider(cand: NameCandidate): void {
  if (top.length < limit) {
    top.push(cand);
    top.sort((a, b) => b.totalScore - a.totalScore);
  } else if (limit > 0 && cand.totalScore > top[top.length - 1].totalScore) {
    top[top.length - 1] = cand;          // 최하위 교체
    top.sort((a, b) => b.totalScore - a.totalScore);
  }
}
```

- 메모리 **O(topN)** (topN ≤ 50) — pool 크기·조합 수와 무관. OOM 구조적 제거.
- **exact top-N** (근사 아님): 모든 조합을 `consider`하므로 결과 = 전체 정렬 후 `slice(topN)`와 점수 동일. 동점 후보의 배열 순서만 정렬 경로 차이로 달라질 수 있음 (점수는 동일).
- `makeCandidate`는 조합마다 호출되나 객체는 즉시 버려짐 (GC 대상) — 동시 상주 = topN + 1.

## 3. POOL_LIMIT 1000 → 500

bounded top-N로 메모리는 이미 O(topN)이라 풀 상한은 **메모리가 아닌 latency 기준**으로만 결정.

- n=2 조합: 1000² = 100만 → 500² = 25만 (CPU ~1.9s → ~0.5s 추정). latency 여유 확보.
- 자문 thread의 200-300 권장은 메모리 기준 산정 — bounded top-N 도입으로 전제가 바뀌어 **500으로 정정** (도메인 풀 다양성 보존).

## 4. frequency 무효 발견 → 39-C flag

진단 중 `hanja.frequency` 컬럼이 **전 9,460 row 모두 default 3**임을 확인 (005 적재 시 per-한자 빈도 데이터 부재). recommend/hanja-search의 `ORDER BY frequency DESC, stroke ASC` 에서 첫 키가 상수 → **실효 정렬 = stroke ASC**.

- 기능 영향 없음 (정렬은 여전히 결정적). 단 "빈도순 우선 추천" 의도가 미작동.
- 빈도 정렬·다양성·점수 가중치는 frequency 실데이터 확보가 선행 → **39-C로 이관** (BACKLOG 39-C flag 기록). C-5-7c 범위 외.

## 5. 검증

| case | 내용 | 결과 |
|---|---|---|
| poc case1-3 | 기존 (n=2/n=1/yongsin 빈) | 회귀 없음 |
| poc case4 | bounded 정확성 — topN=3 점수 == 전체 정렬(topN=30) 상위 3 점수 | exact 확인 |
| poc case5 | 대형 합성 풀 500자 n=2 (약 25만 조합) — no-throw + 정렬 + finite | OOM 회귀 가드 |

- `npm run build` TS 통과 / `poc/names-poc.test.ts` 5 case 통과.

### dev HTTP 회귀 (2026-05-21 — 커밋 ce1cd09 dev 반영 후)

dev.brennhub.com `/api/saju-naming/recommend` 실 HTTP — 5항목 전부 통과. verbatim:

```text
=== dev 재배포 반영 — 회귀 검증 시작 ===
n=1: HTTP 200 (115ms) candidates=5
  top: {"hanja":"汎","hangeul":"범","strokes":[6],"ohaengList":["수"],"soundOhaengList":["수"],"surieScore":90,"ohaengScore":50,"soundScore":50,"totalScore":64,"breakdown":"오행20+수리31+발음13=64"}
n=2: HTTP 200 (584ms) candidates=5
  top: {"hanja":"汎氾","hangeul":"범범","strokes":[6,5],"ohaengList":["수","수"],"soundOhaengList":["수","수"],"surieScore":90,"ohaengScore":100,"soundScore":100,"totalScore":97,"breakdown":"오행40+수리31+발음25=97"}
사주 필터: yongsin[수] = 汎氾,汎汃,汎名,汎汶,汎汸,汎汾,汎沐,汎沒,汎沔,汎沕
           yongsin[목] = 扛乫,扛乬,扛扱,扛朹,扛机,扛技,扛抉,扛杰,扛杲,扛果
           필터 효과(상이): true
null-stroke: 0건 (검사 후보 30)
latency n=2 (20회): min=105 p50=113 p95=193 max=465 ms
=== 회귀 통과 ===
```

- n=2 HTTP **200** — C-5-7b 메모리 503 해소 확인 (C-5-7c 핵심).
- latency n=2 p95 **193ms** — C-5-7b가 100만 조합 ~1.9s로 추정했으나 bounded top-N + POOL_LIMIT 500(25만 조합)으로 대폭 하회. OOM 해소가 본질이고 latency도 부수 개선.
- 정렬 순서 `汎氾→汎汃→汎名…` = stroke ASC — `frequency` 무효(§4) dev 재확인.
- SSL: 사내 프록시 self-signed cert → 검증 스크립트 실행 시 `NODE_OPTIONS=--use-system-ca` 필요.

## 6. 한계 / 후속

- bounded top-N의 `consider`는 매 삽입마다 `top.sort` (O(topN log topN)). topN ≤ 50이라 무시 가능 — 필요 시 binary insert로 추가 단축 여지.
- frequency 실데이터 = 39-C.
- C-5-7b "LIMIT으로 CPU 안전" 가정의 메모리 누락 — 이후 Workers 한도 판단 시 **CPU·메모리 별개로 검토** (메모리 128MB 고정).
