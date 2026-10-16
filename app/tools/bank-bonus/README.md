# Bank Bonus Tracker (bank-bonus)

미국 은행 계좌 개설 보너스를 공개 소스에서 모아 한 화면에서 거르고 추천 순위를 매기는 개인용 도구.
**admin 전용 + devOnly** — `page.tsx`가 세션·`is_admin`을 직접 검사 (`/tools/*`는 middleware 밖), prod에서는 404.

## 데이터 흐름

```
GET /api/admin/bank-bonus/refresh   (admin 세션, 임시 GET — 추후 POST + cron)
  └ listEnabledSources (bb_sources.enabled=1)
     └ fetchSource(source)            lib/bank-bonus/engine.ts
        ├ fetchFresh(url)             http.ts — 데스크톱 UA, no-store/no-cache
        ├ parser by source.key        parse-master.ts / parse-rss.ts / parse-csv.ts (코드 파싱만, AI 없음)
        │   └ derive.ts               원문 → DD·만료·CA·자금 묶임·지점·hard pull·타겟·오퍼 여부 (보수적, 모르면 NULL)
        ├ upsertOffers → bb_offers    신규 insert / 변경 update / master는 사라진 항목 gone
        └ recordRun → bb_fetch_runs
GET /api/admin/bank-bonus/offers    listStoredOffers(active, RSS 제외) → merge.ts → score.ts → offers.ts(필터·정렬·요약·Top 5)
POST /api/admin/bank-bonus/flags    bb_offer_flags upsert (⭐ 관심 / 숨김 / 신청함 / 메모)
GET /api/admin/bank-bonus/posts     최근 14일 RSS 글 (고정 포함) — 오퍼와 별개
GET /api/admin/bank-bonus/runs      최근 run 50건
GET /api/admin/bank-bonus/probe     일회성 fetch probe (D1 쓰기 없음, prod 404)
/tools/bank-bonus                   신선도 한 줄 → 숫자 3개 → 추천 Top 5 → 전체 표(폰은 카드) → 최근 글
```

DB: `AUTH_DB`의 `bb_sources` / `bb_fetch_runs` / `bb_offers` / `bb_offer_flags` —
`migrations/auth/014_bank_bonus.sql`, `015_bank_bonus_flags.sql`. 적용은 수동, preview만.

## 소스

| key | 내용 | 상태 |
|---|---|---|
| `doc_master` | DoC Best Bank Account Bonuses (html) | 활성. `#toc_container` 아래 `<h2>` 섹션 → `<h3>` 항목 + `<p>` 메모 + `<li>` 불릿. 섹션 = 유형 (주·지역 섹션은 제목 → 글 URL slug → 메모 순으로 유형 추정). 사라진 항목 gone. |
| `doc_rss` | DoC 은행 계좌 카테고리 RSS | 활성. **글**로만 쓴다 — 오퍼 병합에 들어가지 않음. 미래 pubDate = 고정. |
| `doc_quickref` | DoC Quick Reference — 공개 Google Sheets CSV export | **보관 (enabled=0)**. 시트가 2021-12 이후 갱신 없음(최신 만료일 2022-12-24). CSV export는 하이퍼링크를 잃어 "DoC Post"가 "Link" 글자뿐. 파서(`parse-csv.ts`)는 준비 완료 — 켜면 바로 동작. |

## 판정 규칙 (추측 금지)

- master `nationwide`: 주 제한 없음 + 일반 섹션이면 1, 주 판정됨 또는 State/Region 섹션이면 0. `ca_eligible`: 전국 1 / 주 목록에 CA 1 / CA 없음 0.
- RSS (DoC 제목 관례): 앞 대괄호에 주 코드(`[FL, GA]`, `[NY, In Branch]`) → state_text + nationwide 0 / 대괄호 없음 → nationwide 1 / 주 코드 없는 대괄호(`[Targeted]`, `[Expired]`, `[Update]`) → nationwide NULL.
- 보너스: 첫 금액 표현 — `$300-$400`·`$300/$400`·`$75 – $300` → min/max, `Up To $500` → min NULL.
- DD: "No direct deposit required" → 0, "direct deposit" + 금액 → 1 + 금액(첫 금액), 금액 없으면 1 + NULL.
- 자금 묶임: 한 문장에 $1,000+ 예치 금액 + 기간("for 60+ days", "day 31 through 90", "six months") 또는 "Requires a $X deposit"(기간 NULL). DD 문장은 제외.
- 만료: "Valid through M/D/YY" 류 문구가 있을 때만.
- 오퍼 아님(`is_offer=0`): 제목이 "Best "로 시작 / Roundup·Reference·List Of / 증권·코인 (유형 brokerage·other).

## 병합 키

`url:<detail_url 정규화>` (master "Read our full post" = CSV "DoC Post"), 없으면 `bank:<은행 소문자>|<유형>`.
bonus·DD·만료·전국/CA·카드 입금은 CSV 행 우선, 조회·섹션/순위·메모는 master 행. `bb_offer_flags.offer_key`가 이 키.

## 추천 점수 (`score.ts`, 설정 `config.ts`)

score = bonus_max (없으면 bonus_min), 이후 계수 곱:

| 조건 | 효과 | 태그 |
|---|---|---|
| 전국도 CA 가능도 아님 · 입출금/저축 아님 · 기존 거래 은행 · 오퍼 아님 | Top 5 제외 | — |
| 자금 묶임 | ×0.4 | 자금 묶임 |
| DD 필요 + DD 금액 > $5,000 | ×0.7 | — |
| 지점 개설만 | ×0.7 | 지점만 |
| hard pull | ×0.8 | hard pull |
| 타겟 | ×0.5 | 타겟 |
| 30일 내 마감 | — | 마감 임박 |
| 처음 본 지 7일 이내 | — | 신규 |

기존 거래 은행: `config.ts` `existingBanks` (은행명에 포함, 대소문자 무시). 적용된 규칙은 전부 ko/en 이유로 응답에 실린다.
Top 5 = 추천 대상 중 숨김·신청함 제외, 점수 순.
