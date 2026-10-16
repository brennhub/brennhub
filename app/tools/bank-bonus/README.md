# Bank Bonus Tracker (bank-bonus)

미국 은행 계좌 개설 보너스를 공개 소스에서 모아 한 화면에서 거르는 개인용 도구.
**admin 전용 + devOnly** — `page.tsx`가 세션·`is_admin`을 직접 검사 (`/tools/*`는 middleware 밖), prod에서는 404.

## 데이터 흐름

```
GET /api/admin/bank-bonus/refresh   (admin 세션, 임시 GET — 추후 POST + cron)
  └ listEnabledSources (bb_sources.enabled=1)
     └ fetchSource(source)            lib/bank-bonus/engine.ts
        ├ fetchFresh(url)             lib/bank-bonus/http.ts  — 데스크톱 UA, no-store/no-cache
        ├ parser by source.key        parse-master.ts / parse-rss.ts (코드 파싱만, AI 없음)
        ├ upsertOffers → bb_offers    신규 insert / 변경 update / master는 사라진 항목 gone
        └ recordRun → bb_fetch_runs   status·final_url·Last-Modified·Age·source_as_of·건수
/tools/bank-bonus                    server: 신선도(listFreshness) → client-shell
  └ GET /api/admin/bank-bonus/offers  type · caEligible · minBonus · status · sort
GET /api/admin/bank-bonus/runs        최근 run 50건
GET /api/admin/bank-bonus/probe       일회성 fetch probe (D1 쓰기 없음, prod 404)
```

DB: `AUTH_DB`의 `bb_sources` / `bb_fetch_runs` / `bb_offers` — `migrations/auth/014_bank_bonus.sql`.
적용은 수동 (`wrangler d1 execute brennhub-auth-dev --env preview --remote --file=...`). Phase 1은 preview만.

## 소스

| key | 내용 | 파서 |
|---|---|---|
| `doc_master` | DoC Best Bank Account Bonuses — 월간 마스터 목록 | `parse-master.ts`: `#toc_container` 아래 `<h2>` 섹션 → `<h3>` 항목 + `<li>` 불릿. 섹션으로 account_type, 헤딩 대시 조각/"XX only"로 주. `source_as_of` = "For <Month>, <Year> / last change MM/DD/YY". 사라진 항목 gone. |
| `doc_rss` | DoC 은행 계좌 카테고리 RSS | `parse-rss.ts`: guid(날짜 꼬리 `?d=` 제거)=external_key. 미래 pubDate=pinned. `[FL, GA]` 대괄호로 주. 판정 불가 필드는 NULL. gone 처리 없음. |
| `doc_quickref` | DoC Quick Reference Table | 비활성 (파서 없음). 실제 데이터는 링크된 Google Sheets — BACKLOG 참조. |

## 판정 규칙 (추측 금지)

- `nationwide`: master는 주 제한 없음 + 일반 섹션이면 1, 주 판정됨 또는 State/Region 섹션이면 0.
- RSS (DoC 제목 관례): 앞 대괄호에 주 코드(`[FL, GA]`, `[NY, In Branch]`) → state_text + nationwide 0 / 대괄호 없음 → nationwide 1 / 주 코드 없는 대괄호(`[Targeted]`, `[Expired]`, `[Update]`) → nationwide NULL.
- CA 가능(`caEligible=1`) = `nationwide=1` 또는 `state_text`에 CA. NULL은 제외.
- 보너스: 첫 금액 표현 — `$300-$400`·`$300/$400`·`$75 – $300` → min/max, `Up To $500` → min NULL.
