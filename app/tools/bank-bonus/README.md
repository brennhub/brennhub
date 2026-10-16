# Bank Bonus Tracker (bank-bonus)

미국 은행 계좌 개설 보너스를 공개 소스에서 모아, "지금 할 만한 오퍼"를 한눈에 보여 주는 개인용 도구.
**admin 전용 + devOnly** — `page.tsx`가 세션·`is_admin`을 직접 검사 (`/tools/*`는 middleware 밖), prod에서는 404.
AI 호출 없음 — 전부 코드(정규식) 추출.

## 데이터 흐름

```
GET /api/admin/bank-bonus/refresh   (admin 세션, 임시 GET — 추후 POST + cron)
  └ refreshAll                       lib/bank-bonus/engine.ts
     ├ 활성 소스마다 fetchSource      fetchFresh → parse-master / parse-rss (parse-csv는 보관) → derive.ts → upsert → run 기록
     │                                 첫 성공 run 종료 시각 = bb_sources.first_ok_at (신규 기준선)
     └ fetchDetails                   지금 할 만한 오퍼 + 관심(⭐) 오퍼의 DoC 상세 글
                                      보너스 큰 순 최대 40건 · 300ms 간격 · 7일 안에 받은 건 건너뜀 → detail.ts → bb_offer_details
GET  /api/admin/bank-bonus/offers   저장 행(RSS 제외) → merge.ts → rules.ts(상세 글 값 우선) → offers.ts(필터·정렬·요약·Top 5)
POST /api/admin/bank-bonus/flags    관심 / 숨김 / 신청 완료 / 메모 (bb_offer_flags)
GET  /api/admin/bank-bonus/posts    최근 7일 RSS 글 (상단 고정 포함) — 오퍼와 별개
GET  /api/admin/bank-bonus/runs     최근 run 50건
GET  /api/admin/bank-bonus/probe    일회성 fetch probe (D1 쓰기 없음, prod 404)
```

DB (`AUTH_DB`): `bb_sources` · `bb_fetch_runs` · `bb_offers` · `bb_offer_flags` · `bb_offer_details`
— `migrations/auth/014`~`016`. 적용은 수동, preview만.

## 소스

| key | 내용 | 상태 |
|---|---|---|
| `doc_master` | DoC Best Bank Account Bonuses (html) | 활성. `<h2>` 섹션 → `<h3>` 항목 + `<p>` 메모 + `<li>` 불릿. 사라진 항목 gone. |
| `doc_rss` | DoC 은행 계좌 카테고리 RSS | 활성. **글**로만 — 오퍼 병합에 안 들어감. |
| `doc_quickref` | DoC Quick Reference 시트 CSV | **보관 (enabled=0)** — 2021-12 이후 갱신 없음, CSV에 글 링크 없음. |

## Top 5 규칙 (점수 없음)

**지금 할 만한 오퍼** = 입출금 계좌 AND (전국 OR CA 가능) AND 예치금 묶임 없음 AND 내 거래 은행 아님(`config.ts` existingBanks)
AND 타겟 오퍼 아님 AND 계좌 오퍼(묶음 글·증권·코인 아님) AND active(목록에 있음 + 상세 글이 `[Expired]` 아님)
AND 숨김·신청 완료 아님.

Top 5 = 위 집합을 보너스 상한 큰 순(같으면 하한 큰 순). 숫자 3개(지금 할 만한 오퍼 · 30일 내 마감 · 최근 7일 새 오퍼)도
이 집합 기준이며 표 필터와 무관. 표의 "지금 할 만한 것만" 토글이 같은 규칙을 표에 건다.
신청 완료한 오퍼는 Top 5에서 빠지고 표에는 "신청 완료" 표시로 남는다.

**신규** = 처음 본 시각이 그 소스의 첫 성공 run 종료(`first_ok_at`) 이후 AND 7일 이내. 초기 적재분은 신규가 아니다.

## 상세 글 추출 (`detail.ts` → `bb_offer_details`)

첫 `<article>`만 본다 (댓글 제외). `<del>` 취소선 값은 버린다. 약관 문장은 "The Fine Print" 섹션 우선, 없으면 글 전체.

| 필드 | 근거 |
|---|---|
| `expires_on` | ① "Update …: Extended to/through/till <날짜>" ② "Offer at a glance"의 Expiration date ③ 약관의 expires on / valid through / through / until / by <날짜>. **글을 마지막으로 손본 날(게시일·최신 Update)보다 이른 날짜는 방치된 옛 값이라 버림.** |
| `apply_methods` | online: "Direct link to offer" 링크 또는 온라인 개설 문구 · branch: in-branch · code: offer/promo/bonus/coupon code · invite: targeted/mailer. 요약·The Offer·약관만 본다 (Our Verdict·FAQ는 반대 뜻으로도 써서 제외). |
| `dd_amount` / `dd_days` | "direct deposit(s) of $X … within Y days", "$X or more in qualifying electronic/direct deposits within Y days" (범위면 하한, 예시 문장 제외). 금액 없으면 요약의 "Direct deposit required: Yes, $X". |
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
