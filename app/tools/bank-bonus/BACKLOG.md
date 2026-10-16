# bank-bonus BACKLOG

- [ ] Manual refresh button on the page (on hold, revisit later)
- [ ] Phase 2b: historical comparison badge from the quick reference CSV expired rows, post phrases, and own history
- [ ] Phase 2c: official bank page verification (bb_bank_rules source='official', 마감일·DD 조건 확인)
- [ ] Dev worker secret `ANTHROPIC_API_KEY` 등록 (`wrangler secret put ANTHROPIC_API_KEY --env preview`) — 없으면 AI 단계는 건너뜀
- [ ] Quick reference CSV re-enable with bank+type join (시트 갱신 재개 시)
- [ ] Existing banks list editable in UI (지금은 `lib/bank-bonus/config.ts` 상수 + 필터 문구에 이름 고정)
- [ ] Manual reapply rules UI (bb_bank_rules source='manual')
- [ ] Deposit hold parsing improvements (티어별 금액·기간 미구분)
- [ ] Phase 3 My Accounts
- [ ] Phase 4 cron + Claude scheduled report
