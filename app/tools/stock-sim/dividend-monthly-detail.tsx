"use client";

type SeriesPoint = {
  month: number;
  monthPayment: number;
  totalEquity: number;
  totalShares: number;
  cumulativePayment: number;
  monthlyYieldPct: number;
  cumulativeYieldPct: number;
};

type Props = {
  series: SeriesPoint[];
  fmt: Intl.NumberFormat;
  toggleLabel: string;
  monthLabel: string;
  sharesLabel: string;
  equityLabel: string;
  dividendLabel: string;
  cumulativeLabel: string;
  monthlyYieldLabel: string;
  cumulativeYieldLabel: string;
};

export function DividendMonthlyDetail({
  series,
  fmt,
  toggleLabel,
  monthLabel,
  sharesLabel,
  equityLabel,
  dividendLabel,
  cumulativeLabel,
  monthlyYieldLabel,
  cumulativeYieldLabel,
}: Props) {
  return (
    <details className="group rounded-lg border border-border">
      <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium hover:bg-muted/40 marker:content-none">
        <span className="inline-block transition-transform group-open:rotate-90">
          ▶
        </span>{" "}
        {toggleLabel}
      </summary>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{monthLabel}</th>
              <th className="px-3 py-2 text-right font-medium">{sharesLabel}</th>
              <th className="px-3 py-2 text-right font-medium">{equityLabel}</th>
              <th className="px-3 py-2 text-right font-medium">
                {dividendLabel}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {cumulativeLabel}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {monthlyYieldLabel}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {cumulativeYieldLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.month} className="border-t border-border">
                <td className="tnum px-3 py-1.5">{p.month}</td>
                <td className="tnum px-3 py-1.5 text-right">
                  {fmt.format(p.totalShares)}
                </td>
                <td className="tnum px-3 py-1.5 text-right">
                  {fmt.format(p.totalEquity)}
                </td>
                <td className="tnum px-3 py-1.5 text-right">
                  {fmt.format(p.monthPayment)}
                </td>
                <td className="tnum px-3 py-1.5 text-right">
                  {fmt.format(p.cumulativePayment)}
                </td>
                <td className="tnum px-3 py-1.5 text-right">
                  {fmt.format(p.monthlyYieldPct)}%
                </td>
                <td className="tnum px-3 py-1.5 text-right">
                  {fmt.format(p.cumulativeYieldPct)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
