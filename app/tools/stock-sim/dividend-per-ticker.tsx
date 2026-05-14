"use client";

type PerTickerCard = {
  id: string;
  label: string;
  color: string;
  equity: number;
  monthly: number;
  annual: number;
  yieldPct: number;
  finalEquity: number | null;
};

type Props = {
  tickers: PerTickerCard[];
  fmt: Intl.NumberFormat;
  title: string;
  equityLabel: string;
  monthlyLabel: string;
  annualLabel: string;
  yieldLabel: string;
  finalEquityLabel: string;
};

export function DividendPerTicker({
  tickers,
  fmt,
  title,
  equityLabel,
  monthlyLabel,
  annualLabel,
  yieldLabel,
  finalEquityLabel,
}: Props) {
  if (tickers.length < 2) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tickers.map((t) => (
          <div
            key={t.id}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: t.color }}
              />
              <span className="text-sm font-medium">{t.label}</span>
            </div>
            <dl className="space-y-1 text-xs">
              <Row label={equityLabel} value={fmt.format(t.equity)} />
              <Row label={monthlyLabel} value={fmt.format(t.monthly)} />
              <Row label={annualLabel} value={fmt.format(t.annual)} />
              <Row
                label={yieldLabel}
                value={`${fmt.format(t.yieldPct)}%`}
              />
              {t.finalEquity !== null && (
                <Row
                  label={finalEquityLabel}
                  value={fmt.format(t.finalEquity)}
                />
              )}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tnum">{value}</dd>
    </div>
  );
}
