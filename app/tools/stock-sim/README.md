# 주식 시뮬레이터 — `/tools/stock-sim`

- **Purpose**: 평단가 / 배당 / 분할매수 시뮬레이션 (3 탭)
- **Main**: `app/tools/stock-sim/page.tsx` (탭 라우터)
- **Subs**:
  - `cost-basis-calculator.tsx` (Tab 1 — 평단가)
  - `dividend-calculator.tsx` (Tab 2 — 배당) + `dividend-monthly-detail.tsx`, `dividend-per-ticker.tsx`, `dividend-cash-flow-chart.tsx`
  - `dca-down-calculator.tsx` (Tab 3 — 분할매수) + `dca-down-detail.tsx`
- **i18n**: `stockSim.*` (largest namespace, 탭별 nested: `stockSim.dcaDown.*` 등)
- **Patterns**: NumberStepper, Currency/ColorScheme providers, localStorage hydrate+persist, validity guard summary. See [PATTERNS.md](../../../PATTERNS.md).
- **Status**: production

공유 패턴은 루트 [PATTERNS.md](../../../PATTERNS.md). 변경 이력은 [CHANGELOG.md](./CHANGELOG.md), 미완 항목은 [BACKLOG.md](./BACKLOG.md).
