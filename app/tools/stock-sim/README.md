# 주식 시뮬레이터 — `/tools/stock-sim`

- **Purpose**: 평단가 / 배당 / 분할매수 / 분할매도 시뮬레이션 (4 탭)
- **Main**: `app/tools/stock-sim/page.tsx` (탭 라우터)
- **Subs**:
  - `cost-basis-calculator.tsx` (Tab 1 — 평단가)
  - `dividend-calculator.tsx` (Tab 2 — 배당) + `dividend-monthly-detail.tsx`, `dividend-per-ticker.tsx`, `dividend-cash-flow-chart.tsx`
  - `dca-down-calculator.tsx` (Tab 3 — 분할매수) + `dca-down-detail.tsx`
  - `split-sell-calculator.tsx` (Tab 4 — 분할매도) + `split-sell-detail.tsx`
- **i18n**: `stockSim.*` (largest namespace, 탭별 nested: `stockSim.dcaDown.*`, `stockSim.splitSell.*` 등)
- **Patterns**: NumberStepper, Currency/ColorScheme providers, localStorage hydrate+persist, validity guard summary, 최대잔여 정수 배분. See [PATTERNS.md](../../../PATTERNS.md).
- **Note**: 분할매도 탭은 분할매수 탭의 1:1 미러 구조 (매수↔매도, 하락↔상승). 세금은 전체 실현손익에 단일 세율 적용 — 회차별 보유기간 구분 없음.
- **Status**: production

공유 패턴은 루트 [PATTERNS.md](../../../PATTERNS.md). 변경 이력은 [CHANGELOG.md](./CHANGELOG.md), 미완 항목은 [BACKLOG.md](./BACKLOG.md).
