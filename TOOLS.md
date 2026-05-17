# Tools

도구 인벤토리. 도구당 ~10줄. 코드 detail은 파일을 보고, 재사용 패턴은 [PATTERNS.md](./PATTERNS.md).

## Email Diagnostics — `/tools/email-diag`
- Purpose: 도메인의 SPF / DMARC / MX / PTR 진단 + AI 요약
- Main: `app/tools/email-diag/page.tsx`
- API: `app/api/email-diag/route.ts` (Cloudflare Workers AI 또는 Anthropic)
- i18n: `emailDiag.*`
- Status: production

## Cron Converter — `/tools/cron-trans`
- Purpose: cron 식 ↔ 자연어 양방향 변환
- Main: `app/tools/cron-trans/page.tsx`
- API: `app/api/cron-trans/route.ts` (`cron-parser` + AI)
- i18n: `cronTrans.*`
- Status: production

## Stock Simulator — `/tools/stock-sim`
- Purpose: 평단가 / 배당 / 분할매수 시뮬레이션 (3 탭)
- Main: `app/tools/stock-sim/page.tsx` (탭 라우터)
- Subs: `cost-basis-calculator.tsx`, `dca-down-calculator.tsx` (+ `dca-down-detail.tsx`), `dividend-calculator.tsx` (+ `dividend-monthly-detail.tsx`, `dividend-per-ticker.tsx`, `dividend-cash-flow-chart.tsx`)
- i18n: `stockSim.*` (largest namespace, 탭별 nested: `stockSim.dcaDown.*` etc.)
- Patterns: NumberStepper, Currency/ColorScheme providers, localStorage hydrate+persist, validity guard summary. See [PATTERNS.md](./PATTERNS.md).
- Status: production

## Feedback — universal
- Purpose: 사용자 피드백 수집 (모든 페이지 floating + 대시보드 카드 아이콘)
- API: `app/api/feedback/route.ts` (D1 INSERT, IP-hashed rate limit)
- UI: `components/feedback-button.tsx` (layout 마운트), `components/feedback-dialog.tsx`
- Storage: Cloudflare D1 — `brennhub-feedback` (prod) / `brennhub-feedback-dev` (preview), schema `schema/feedback.sql`
- i18n: `feedback.*`
- Status: production

## `[slug]` fallback — `/tools/[slug]`
- Purpose: 미공개 도구 슬러그 진입 시 "coming soon" 안내
- Files: `app/tools/[slug]/page.tsx` + `client-page.tsx`
- Registry: `lib/tools-registry.ts`
