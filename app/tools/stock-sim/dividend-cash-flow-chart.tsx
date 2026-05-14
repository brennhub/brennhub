"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SeriesPoint = {
  month: number;
  monthPayment: number;
  totalEquity: number;
  totalShares: number;
  cumulativePayment: number;
};

type Props = {
  series: SeriesPoint[];
  fmt: Intl.NumberFormat;
  monthLabel: string;
  dividendLabel: string;
  cumulativeLabel: string;
};

type ChartTooltipPayloadEntry = {
  dataKey?: string | number;
  value?: number | string;
  name?: string | number;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipPayloadEntry>;
  label?: string | number;
  fmt: Intl.NumberFormat;
  monthLabel: string;
  dividendLabel: string;
  cumulativeLabel: string;
};

export function DividendCashFlowChart({
  series,
  fmt,
  monthLabel,
  dividendLabel,
  cumulativeLabel,
}: Props) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <ComposedChart
          data={series}
          margin={{ top: 10, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickFormatter={(v) => fmt.format(v as number)}
            width={56}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickFormatter={(v) => fmt.format(v as number)}
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={(args) => (
              <ChartTooltip
                active={args.active}
                payload={
                  args.payload as
                    | ReadonlyArray<ChartTooltipPayloadEntry>
                    | undefined
                }
                label={args.label as string | number | undefined}
                fmt={fmt}
                monthLabel={monthLabel}
                dividendLabel={dividendLabel}
                cumulativeLabel={cumulativeLabel}
              />
            )}
          />
          <Bar
            yAxisId="left"
            dataKey="monthPayment"
            fill="var(--primary)"
            name={dividendLabel}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePayment"
            stroke="var(--muted-foreground)"
            name={cumulativeLabel}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  monthLabel,
  dividendLabel,
  cumulativeLabel,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const div = payload.find((p) => p.dataKey === "monthPayment")?.value;
  const cum = payload.find((p) => p.dataKey === "cumulativePayment")?.value;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div className="font-medium">
        {monthLabel} {label}
      </div>
      {typeof div === "number" && (
        <div className="tnum">
          {dividendLabel}: {fmt.format(div)}
        </div>
      )}
      {typeof cum === "number" && (
        <div className="tnum text-muted-foreground">
          {cumulativeLabel}: {fmt.format(cum)}
        </div>
      )}
    </div>
  );
}
