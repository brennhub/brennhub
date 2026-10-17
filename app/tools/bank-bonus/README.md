# Bank Bonus Tracker (bank-bonus)

미국 은행 계좌 개설 보너스를 공개 소스에서 모아, "지금 할 만한 오퍼"를 한눈에 보여 주는 개인용 도구.
**admin 전용 + devOnly** — `page.tsx`가 세션·`is_admin`을 직접 검사 (`/tools/*`는 middleware 밖), prod에서는 404.
추출은 코드(정규식)가 먼저, 정규식이 못 채운 칸만 Cowork가 뽑아 저장소에 커밋한 값으로 채운다 — 근거 인용이 원문에서 확인될 때만 (아래 "Cowork 파이프라인").
Worker에서 외부 AI API를 부르지 않는다.

## 데이터 흐름

```
GET /api/admin/bank-bonus/refresh   (admin 세션, 임시 GET — 추후 POST + cron)
  └ refreshAll                       lib/bank-bonus/engine.ts
     ├ 활성 소스마다 fetchSource      fetchFresh → parse-master / parse-rss (parse-csv는 보관) → derive.ts → upsert → run 기록
     │                                 첫 성공 run 종료 시각 = bb_sources.first_ok_at (신규 기준선)
     │   doc_churn                    parse-churn.ts → bb_bank_rules (source='doc_churn', 통째 교체)
     ├ fetchDetails                   지금 할 만한 오퍼 + 관심(⭐) 오퍼의 DoC 상세 글
     │                                보너스 큰 순 최대 40건 · 300ms 간격 · 7일 안에 받은 건 건너뜀 → detail.ts → bb_offer_details
     │                                약관에서 읽은 재신청 기간은 bb_bank_rules(source='doc_post')에도 기록
     └ coworkIngest                   data/bank-bonus/extractions.json (빌드 시 번들) → evidence.ts 근거 대조 → 빈 칸만 채움
GET  /api/admin/bank-bonus/offers   저장 행(RSS 제외) → merge.ts → rules.ts(상세 글 값 우선) → offers.ts(필터·정렬·요약·Top 5)
POST /api/admin/bank-bonus/flags    관심 / 숨김 / 신청 완료 / 메모 (bb_offer_flags)
GET  /api/admin/bank-bonus/posts    최근 7일 RSS 글 (상단 고정 포함) — 오퍼와 별개
GET  /api/admin/bank-bonus/runs     최근 run 50건
GET  /api/admin/bank-bonus/probe    일회성 fetch probe (D1 쓰기 없음, prod 404)
GET  /api/bank-bonus/export          Cowork용 공개 export (세션 불필요, prod 404) — DoC 원문 + 오퍼 키만
```

DB (`AUTH_DB`): `bb_sources` · `bb_fetch_runs` · `bb_offers` · `bb_offer_flags` · `bb_offer_details` · `bb_bank_rules`
— `migrations/auth/014`~`017`. 적용은 수동, preview만.

## 소스

| key | 내용 | 상태 |
|---|---|---|
| `doc_master` | DoC Best Bank Account Bonuses (html) | 활성. `<h2>` 섹션 → `<h3>` 항목 + `<p>` 메모 + `<li>` 불릿. 사라진 항목 gone. |
| `doc_rss` | DoC 은행 계좌 카테고리 RSS | 활성. **글**로만 — 오퍼 병합에 안 들어감. |
| `doc_quickref` | DoC Quick Reference 시트 CSV | **보관 (enabled=0)** — 2021-12 이후 갱신 없음, CSV에 글 링크 없음. |
| `doc_churn` | DoC A List Of Churnable Bank Account Bonuses (html) | 활성. 오퍼가 아니라 **은행 단위 재신청 규칙** — `<h3>` 은행(주 목록 제거) + 문단·불릿별 약관 인용. 독자 보고("Yes: 1, 2")만 있으면 기간 null. |

## Top 5 규칙 (점수 없음)

**지금 할 만한 오퍼** = 입출금 계좌 AND (전국 OR CA 가능) AND **기본 보너스에** 예치금 묶임 없음 AND 내 거래 은행 아님(`config.ts` existingBanks)
AND 타겟 오퍼 아님 AND 계좌 오퍼(묶음 글·증권·코인 아님) AND active(목록에 있음 + 상세 글이 `[Expired]` 아님)
AND 숨김·신청 완료 아님.

Top 5 = 위 집합을 **기본 금액(`bonus_base`, 모르면 bonus_max)** 큰 순(같으면 하한 큰 순). 숫자 3개(지금 할 만한 오퍼 · 30일 내 마감 · 최근 7일 새 오퍼)도
이 집합 기준이며 표 필터와 무관. 표의 "지금 할 만한 것만" 토글이 같은 규칙을 표에 건다.
신청 완료한 오퍼는 Top 5에서 빠지고 표에는 "신청 완료" 표시로 남는다.

**신규** = 처음 본 시각이 그 소스의 첫 성공 run 종료(`first_ok_at`) 이후 AND 7일 이내. 초기 적재분은 신규가 아니다.

## 상세 글 추출 (`detail.ts` → `bb_offer_details`)

첫 `<article>`만 본다 (댓글 제외). `<del>` 취소선 값은 버린다. 약관 문장은 "The Fine Print" 섹션 우선, 없으면 글 전체.

| 필드 | 근거 |
|---|---|
| `expires_on` | ① "Update …: Extended to/through/till <날짜>" ② "Offer at a glance"의 Expiration date ③ 약관의 expires on / valid through / through / until / by <날짜>. **글을 마지막으로 손본 날(게시일·최신 Update)보다 이른 날짜는 방치된 옛 값이라 버림.** |
| `apply_methods` | online: "Direct link to offer" 링크 또는 온라인 개설 문구 · branch: in-branch · code: offer/promo/bonus/coupon code · invite: targeted/mailer. 요약·The Offer·약관만 본다 (Our Verdict·FAQ는 반대 뜻으로도 써서 제외). |
| `dd_amount` / `dd_days` | "direct deposit(s) of $X … within Y days", "$X or more in qualifying electronic/direct deposits within Y days" (예시 문장 제외). **범위·등급이면 금액을 비우고 티어**(Phase 2c-1). 금액 없으면 요약의 "Direct deposit required: Yes, $X"(범위면 역시 티어). |
| `churn_months` / `churn_text` | 자격 문장의 과거 창: past/last/previous/prior N months·years·days, within N … prior, every N years. 보너스 언급 문장 우선. 일→개월 환산. |
| `early_termination_text` / `monthly_fee_text` | 요약 항목 우선, 없으면 해당 문구 문장. |
| `bank_offer_url` | "Direct link to offer" 링크 (취소선 처리된 옛 링크 대신 붙은 "New link" 포함). |
| `post_expired` | 글 제목 `[Expired]` 또는 "Deal has ended" → 할 만한 오퍼에서 제외. |

offers API는 상세 글 값을 우선하고, 없으면 master 불릿 값(DD·지점·조회 등)을 쓴다.

## 화면 용어 (ko / en)

| 항목 | ko 값 | en 값 |
|---|---|---|
| 신청 마감 / Apply by | 날짜 · 마감일 미표기 · 날짜 (지남, 확인 필요) | date · Not stated · date (passed, needs checking) |
| 신청 방법 / How to apply | 온라인 · 지점 방문 · 오퍼 코드 필요 · 초대받은 사람만 | Online · Branch visit · Offer code required · Invite only |
| 보너스 조건 / Bonus requirement | 직접입금 $1,000, 90일 이내 · 직접입금 필요(금액 미상) · 직접입금 불필요 | Direct deposit $1,000 within 90 days · Direct deposit required (amount not stated) · No direct deposit needed |
| 재신청 가능 / Reapply | 12개월 후 가능 | Eligible again after 12 months |
| 지역 / Region | 전국 · CA 가능 · CA 불가 | Nationwide · CA eligible · Not in CA |
| 신용조회 / Credit check | 기록 안 남음 · 기록 남음 | No record left (soft) · Record left (hard) |
| 신용카드 초기 입금 / Credit card funding | 가능 $500까지 · 불가 | Up to $500 · Not allowed |
| 태그 / Tags | 예치금 $100,000 필요 (60일) · 지점 방문 필요 · 신용조회 기록 남음 · 타겟 오퍼 · 최근 7일 신규 · 마감 임박 | Deposit hold $100,000 (60 days) · Branch only · Hard credit pull · Targeted · New this week · Ending soon |
| 모름 | 확인 필요 (흐리게, 경고 아님) | Needs checking |

모든 문구는 `lib/bank-bonus/messages.ts`. 펼침의 원문 제목·메모·약관, 최근 글 제목, 보너스 괄호 메모는 출처 원문 그대로.

## 판정 규칙 (master 파생, 추측 금지)

- `nationwide` / `ca_eligible`: 주 제한 없음 + 일반 섹션 → 전국. 주 목록에 CA → CA 가능, 없으면 CA 불가.
- RSS 제목 관례: `[FL, GA]` → 그 주 / 대괄호 없음 → 전국 / `[Targeted]` 등 → 판정 불가.
- 보너스: 첫 금액 표현(`$300-$400`, `$300/$400`, `Up To $500`). 금액이 든 괄호(`($900 With Savings)`)는 `bonus_note`.
- 자금 묶임: 한 문장에 $1,000+ 예치 + 기간, 또는 "Requires a $X deposit". DD 문장 제외.
- 병합 키: `url:<글 URL>` 또는 `bank:<은행>|<유형>` — `bb_offer_flags`·`bb_offer_details`의 `offer_key`.

## 겹친(스택)·등급 오퍼

| 필드 | 뜻 |
|---|---|
| `bonus_base` | 직접입금만으로 받는 금액 (입출금 몫). 정렬·Top 5 기준. |
| `bonus_total_with_deposit` | 저축까지 겹치거나 최상위 예치 등급일 때 총액. |
| `bonus_total_note` | `savings`(저축 포함 시) / `top_tier`(최고 등급). |
| `deposit_hold_amount/days` + `deposit_hold_scope` (상세 글) | `extra` = 겹친 부분만 예치 필요 → 할 만한 오퍼 판정에 영향 없음 · `base` = 어떤 보너스든 예치 필요 → 제외. |

읽는 곳 (`detail.ts` findStacked, 앞에서부터):
1. The Offer 불릿에 "입출금 보너스 $X (예치·유지 문구 없음)" + "저축 + new money/balance/maintain" 불릿이 함께 있고, 요약 "Maximum bonus amount"가 X보다 큼 → base X, total = 최대액, 예치는 저축 불릿에서 (extra).
2. 요약 "Additional requirements: None for checking; $15,000 balance for savings" → 저축 겹침 (extra).
3. 요약 "Direct deposit required: No/None" + "Additional requirements: $20,000-$100,000 deposit" → 등급형: total = 최대액, 예치 = 최상위 금액 (base).
4. "$900 | New Money Deposit Amount $15,000 or more" 같은 등급 줄 → 최상위 등급 (base).
5. master 제목 괄호 "($900 With Savings)" → total 900, note savings (base는 상세 글에서만).

화면: 큰 글씨 = 기본 금액, 아래 작은 줄 = "저축 포함 시 $900 (예치금 $15,000, 90일)" / "With savings $900 (deposit hold $15,000, 90 days)".

## 재신청 규칙 층과 우선순위

| 층 | source | 어디서 |
|---|---|---|
| 직접 입력 | `manual` | bb_bank_rules (UI 없음, 향후) |
| 공식 | `official` | bb_bank_rules (Phase 2c 은행 공식 페이지) |
| DoC 글 | `doc_post` | 이 오퍼 상세 글 약관 정규식 (bb_offer_details.churn_months, 근거 method=regex). 은행 단위로도 기록하지만 표시엔 이 오퍼 글만 쓴다 (같은 은행 다른 상품 혼동 방지). |
| DoC 처닝 목록 | `doc_churn` | bb_bank_rules, 은행명 매칭 (`banks.ts` bankMatches — 정규화 후 같거나 "규칙명 + 공백"으로 시작) |
| Cowork | `cowork` | 이 오퍼 상세 글에서 Cowork가 근거와 함께 채운 값 (근거 method=cowork) |

표시 우선순위: **manual > official > doc_post > doc_churn > cowork**.
개인 계좌 오퍼는 "business"가 든 약관 문장을 재신청 근거로 쓰지 않는다 (글 약관·DoC 처닝 목록 모두). DoC 처닝 목록 규칙은 사업자 오퍼에 붙이지 않는다.
값 있음 → "12개월 후 가능" · 글을 읽었는데 없음 → "글에 명시 없음" / "Not stated in post" · 글을 못 읽음 → "확인 필요" / "Needs checking".

## Cowork 파이프라인

```
① export   GET https://dev.brennhub.com/api/bank-bonus/export        (?all=1 = 상세 글 받은 모든 오퍼)
            → {generatedAt, items:[{offer_key, bank, detail_url, missing[], glance_text, fine_print_text}]}
② Cowork   예약 작업이 export를 읽고, 각 글에서 값 + 원문 그대로 인용을 뽑는다
③ 저장소   data/bank-bonus/extractions.json 에 커밋 → dev 브랜치 push → dev.brennhub.com 재배포
④ ingest   refresh가 파일을 읽어 필드별 근거 대조 → 통과한 값만, 빈 칸만 채움
```

- **export** (`app/api/bank-bonus/export/route.ts`, `lib/bank-bonus/export.ts`): 세션 없음, `/api/admin` 밖. prod에서는 404.
  대상 = 지금 할 만한 오퍼 + 관심(⭐) 오퍼 중 상세 글(HTTP 2xx)이 있고 expires_on · churn_months · dd_amount · dd_days · deposit_hold_amount 중 하나라도 빈 것.
  보너스 큰 순 최대 60건, 약관 원문 6000자 상한. **DoC 공개 원문과 오퍼 키만** — 표시·메모·계좌 등 소유자 정보는 없다
  (관심 표시는 대상 선정에만 쓰고 응답엔 남지 않는다). 헤더: `Cache-Control: no-store`, `X-Robots-Tag: noindex`.
- **데이터 파일** `data/bank-bonus/extractions.json`:
  `{version: 1, generatedAt, items: [{offer_key, source_url, fields: {expires_on, churn_months, churn_text, dd_amount, dd_days, deposit_hold_amount, deposit_hold_days, apply_methods}, evidence: {필드: 원문 그대로 인용}}]}`.
  Worker는 이 파일을 **빌드 시점 import**로 읽는다 (`lib/bank-bonus/cowork.ts` — OpenNext가 Worker 번들에 넣음). 파일을 바꾸면 다음 배포부터 반영.
- **ingest** (`lib/bank-bonus/cowork.ts` + `evidence.ts`): 항목마다 저장된 요약(glance_text) + 약관(fine_print_text)을 원문으로 필드별 판정.
  - 인용 없음 → `no_evidence` · 인용(15자 이상)이 원문에 없음(공백·따옴표·대시 차이만 무시) → `quote_not_found` · 값이 인용 안에 없음 → `value_not_in_quote` · 오퍼 키를 모르거나 원문 없음 → `unknown_offer`.
  - 통과한 값만 저장: extraction_method='cowork', 근거 JSON `{필드: {quote, method: 'cowork'}}`, ai_extracted_at 칸 = 반영 시각.
  - **덮지 않음**: 이미 값 있는 칸은 건너뜀(`skippedExisting`). 재신청은 표시 우선순위상 정규식·DoC 처닝 목록·공식·직접 입력이 늘 이긴다.
  - refresh 응답: `"cowork": {fileGeneratedAt, items, accepted, rejected: {이유: 건수}, skippedExisting}`.

화면 "근거": 신청 마감 · 보너스 조건 · 재신청 가능 옆 작은 버튼 → 근거 문장 + 출처 종류(DoC 글 / DoC 처닝 목록 / Cowork 추출 / 공식) + 링크. 근거 없는 값엔 버튼 없음.

## Cowork transport (GitHub)

세 번 건너간다:

1. **Action → `bb-data`/pending.json** — `.github/workflows/bank-bonus-pending.yml`이 매주 월요일 13:00 UTC(LA 06:00, 서머타임 기준)와 수동 실행 때
   `scripts/bank-bonus/pull-pending.mjs`로 `https://dev.brennhub.com/api/bank-bonus/export?all=1`을 받아
   데이터 전용 브랜치 `bb-data`의 `data/bank-bonus/pending.json`에 커밋한다 (바뀌었을 때만, github-actions bot).
   `bb-data`가 없으면 `data/bank-bonus/` + 짧은 README만 있는 orphan 브랜치로 만든다. 이 워크플로는 dev·main을 건드리지 않는다. 시크릿 불필요(공개 export).
2. **Cowork → `feat/bank-bonus` `data/bank-bonus/extractions.json` → dev** — Cowork가 `bb-data`의 pending.json을 읽어 값 + 원문 인용을 뽑고,
   `feat/bank-bonus`에 extractions.json을 커밋한 뒤 dev로 머지·push.
3. **dev 배포 → refresh ingest** — dev push가 dev.brennhub.com을 재배포(파일은 빌드 시 번들), 다음 refresh가 근거 대조 후 빈 칸만 채운다.

수동 실행: GitHub 저장소 → **Actions** 탭 → 왼쪽 "Bank Bonus Pending Export" → **Run workflow** → 브랜치 선택 → Run.
또는 `gh workflow run bank-bonus-pending.yml --ref dev`.
주의: GitHub는 `schedule`(그리고 Actions 탭의 Run workflow 버튼)을 **기본 브랜치(main)에 있는 워크플로 파일**에만 붙인다 — main에 들어가기 전에는 매주 실행이 돌지 않는다.

## 은행 공식 약관 (Phase 2c-1) — 다섯 질문의 기준

refresh 순서: 소스 → DoC 상세 글 → **은행 공식 페이지** → Cowork 반영.

- **수집** (`engine.ts` fetchOfficial, `official.ts`): 지금 할 만한 오퍼 + 관심(⭐) 오퍼의 `bank_offer_url`(DoC "Direct link to offer").
  refresh당 최대 15건, 300ms 간격, 7일 캐시, DoC와 같은 데스크톱 UA. script·style·nav·header·footer 등을 지우고 보이는 글자만,
  24000자 상한 — 넘으면 terms and conditions / offer details / eligibility / bonus가 처음 나오는 구간부터.
  200이 아니거나 막힘·글자 부족(스크립트로 그리는 페이지)이면 본문 없이 `http_status`·`error`만 저장 → 화면 "공식 페이지 확인 불가".
  본문 해시가 바뀌면 `last_changed_at` 갱신. 저장: `bb_official_pages`.
- **공식 본문 정규식** (`officialRegexFields`): 재신청 기간(개인 계좌면 business 문장 제외), 평생 1회("once per lifetime" 등 — "limit one per customer"는 아님),
  가입 자격 제한 문장 → `bb_offer_details.official_fields` (method=regex). Cowork가 공식 본문에서 근거를 확인한 값(method=cowork)은 덮지 않는다.

## 표시 규칙

- 우선순위: **manual > official(공식 약관) > doc_post(DoC 글 — 정규식·Cowork) > doc_churn**.
- 재신청: 직접 입력 > "1회만 (재신청 불가)"(공식·DoC) > 기간 > DoC 처닝 목록. **공식과 DoC 글 기간이 다르면 긴 쪽** — 둘 다 지켜야 하는 조건
  (예: Chase 공식 페이지 "closed within 90 days" vs DoC 약관 "one bonus every two years" → 24개월).
  "closed with a negative balance within the last N years"는 계좌 이력 제한이라 기간으로 읽지 않는다.
  값 없음: 공식 본문을 읽었으면 "공식 약관에 명시 없음", DoC 글만 읽었으면 "글에 명시 없음", 둘 다 없으면 "확인 필요".
- **부분값 금지**: 직접입금 금액이 범위·등급("$1,000-$1,999", "$2,000 to $4,999.99 to earn the $250 bonus, …", "Yes, $1,000 – $5,000")이면
  하한을 쓰지 않고 `tiered` → "직접입금 (티어)". 보너스 자체가 범위인데 기본 금액을 모르면(예: Citi $325/$475/…) 한 숫자 DD도 "티어".
- **DoC 기준**: 값의 근거가 DoC 약관뿐이고 글에 게시일보다 늦은 Update가 있으면 작은 "DoC 기준" 표시.
- **가입 자격 제한**: 공식 → DoC 순으로 찾은 자격 문장이 군인·고용주·카운티·학교 등 회원 자격을 **제한하는 문장**(must / only / open to / reside / live·work /
  field of membership …)이면 태그 "가입 자격 제한" + 할 만한 오퍼·Top 5에서 제외. 직원 제외 문구·수수료 면제 대상 목록·추천 보너스 문구는 해당 없음.
- **ACH 이체 인정**: 예 / 아니오 / 불명확 / 확인 필요 (Cowork 값만, 근거 있음).
- 근거 출처 표기: 공식 약관 / DoC 글 / DoC 처닝 목록 / Cowork 추출 (Cowork 값이 공식 본문에서 확인되면 "공식 약관 · Cowork 추출").

## 보너스 조건 체크리스트 (`requirements_json`)

단계 = `{order, portion: base|extra, kind: dd|deposit_hold|open_account|debit_txn|enroll|other, text(원문 ≤200자), amount, days, count?, tiered?, quote, source, via}`.
화면: 기본 몫 단계 → "+$N 받으려면" → 추가 몫 단계, 단계마다 근거. 예) Chase: ① 체킹 직접입금 90일 이내 / +$600 받으려면 ② 저축 계좌 동시 개설 ③ $15,000을 90일 유지.
정규식(DoC): 겹친 오퍼(입출금 불릿 + 저축 불릿), 직접입금 문장(금액·기한·티어), 기본 예치, 직불카드 거래 횟수. 못 세우면 null → 한 줄 요약 + "요약(확인 필요)".
우선: 공식 약관 근거 체크리스트(Cowork) > DoC 체크리스트(정규식·Cowork).

## Export 스키마 (Cowork)

`GET https://dev.brennhub.com/api/bank-bonus/export` (`?all=1`) →
`{generatedAt, items: [{offer_key, bank, detail_url, missing[], glance_text, fine_print_text(≤6000), official_url, official_status, official_text(≤24000, 쓸 만한 본문만)}]}`.
`missing` = 아직 값 없는 추출 필드(DoC 칸·공식 값 둘 다 빈 것).

Cowork 파일(`data/bank-bonus/extractions.json`) 필드: expires_on, churn_months(+churn_text), reapply_once_only(0|1), dd_amount, dd_days,
deposit_hold_amount, deposit_hold_days, apply_methods, ach_push(yes|no|unclear), eligibility_text, fee_waiver_text, early_termination_text,
requirements([{order, portion, kind, text, amount, days}]). 근거: 단일 값 필드마다 인용 1개, requirements는 `evidence.requirements` 배열(단계별 인용 1개).
게이트: 인용은 **공식 본문 먼저, 그다음 DoC 요약+약관**에서 찾고(15자 이상, 공백·따옴표·대시 무시), 찾은 쪽을 출처로 기록.
글 필드(eligibility_text·fee_waiver_text·early_termination_text)는 값이 인용의 일부여야 한다. requirements는 한 단계라도 실패하면 전체 버림.
공식 근거 값 → `official_fields`, DoC 근거 값 → 상세 칸(비어 있을 때만).

## Phase 2c-3 — 카드 압축 · 근거 번역 · 인용 위치 링크 · 공식 금액 · 카운티 규칙

**근거 번역 `evidence_ko`** (Cowork 파일, 선택): `evidence`와 같은 키, `evidence_ko.requirements`는 단계 순서 배열.
게이트는 영어 인용만 본다 — 번역은 통과한 값에만 붙는다. 저장(마이그레이션 없음):
DoC 근거 → `bb_offer_details.evidence[필드] = {quote, quote_ko, source: 'doc_post', method: 'cowork', url}`,
공식 근거 → `official_fields[필드] = {value, quote, quote_ko, method}`, 체크리스트 단계 → `step.quote_ko`.
같은 파일을 다시 반영하면 이전 Cowork 값·번역은 갱신(정규식 값은 그대로). 한국어 화면: 번역 먼저 + "원문" 토글, 영어 화면: 원문만, 번역 없으면 원문.

**인용 위치 링크** (`links.ts` `textFragmentUrl(url, quote)`): `url#:~:text=<조각>` — 인용 첫 줄의 첫 문장부호까지, 최대 12단어·120자 미만,
끝 문장부호 제거, `-`는 `%2D`. DoC 근거는 DoC 글, 공식 근거는 공식 페이지 주소. 지원 안 하는 브라우저는 페이지 맨 위를 연다.

**카드**: 순위·은행·금액 → 신청 마감 / 신청 방법 / 보너스 조건(단계 글만, 4단계까지 + "외 N단계") / 재신청 가능 / ACH 이체 인정 → 지역·신용조회 한 줄 → 태그 → 버튼.
줄마다 "근거" 칩 하나 → 그 줄 아래 서랍(번역·원문·출처·출처 열기), 처음엔 모두 닫힘. 표·폰 목록도 같은 칩.

**공식 금액**: Cowork 필드 `bonus_official_max`(근거 인용에 숫자로 있어야 함) · `bonus_official_note`(글 필드) — 공식 본문에서 근거가 확인될 때만, `official_fields`에.
있으면 화면 금액·정렬·최소 보너스 필터 기준, DoC 금액이 다르면 작은 회색 "DoC 표기 $675". offers API 응답 `bonusOfficialMax`/`bonusOfficialNote`.

**카운티 규칙** (`eligibility.ts`, `config.ts` myCounty="Los Angeles" · myState="CA" · myAreaNames):
지역(카운티·도시 나열, live/work/worship/attend school in …)은 Los Angeles · LA County · Gardena · Torrance가 문장에 없을 때만 제한, 주 전체(California)만 말하면 제한 아님.
소속(고용주·학교·군인·단체·field of membership)은 "anyone can join" / "open to everyone" / "membership is open to anyone" 류가 없으면 제한. 지역 쪽이 나를 받아 주면 소속은 대안이라 제한 아님.
태그 툴팁에 걸린 사유·표현. **이전 추출기로 읽은 DoC 글(doc_posted_at 없음)은 7일을 기다리지 않고 다시 읽어** 자격 문장을 채운다.
