# bank-bonus BACKLOG

- [ ] Manual refresh button on the page (on hold, revisit later)
- [ ] Phase 2b history badge from quick reference CSV expired rows (next) — + post phrases and own history
- [x] Card condition checklist: numbered requirements with base vs extra portions (Phase 2c-1)
- [x] Phase 2c-1: official page capture + checklist + no partial values
- [ ] Phase 2c-2: script-rendered / blocked official pages (403·JS) — 다른 경로 검토, bb_bank_rules source='official'
- [ ] export route sits under /api, which robots.ts disallows; fine for CI, revisit if a direct reader is ever needed
- [ ] Weekly schedule needs the workflow file on main (GitHub runs `schedule` only from the default branch)
- [ ] Cowork 예약 작업 설정 — export(`/api/bank-bonus/export`) → `data/bank-bonus/extractions.json` 커밋 (dev)
- [ ] Quick reference CSV re-enable with bank+type join (시트 갱신 재개 시)
- [ ] Existing banks list editable in UI (지금은 `lib/bank-bonus/config.ts` 상수 + 필터 문구에 이름 고정)
- [ ] Manual reapply rules UI (bb_bank_rules source='manual')
- [ ] Deposit hold parsing improvements (티어별 금액·기간 미구분)
- [ ] Phase 3 My Accounts
- [ ] Phase 4 cron + Claude scheduled report
