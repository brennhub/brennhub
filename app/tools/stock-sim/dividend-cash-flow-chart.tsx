"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CHART_BAR_COLOR = "var(--color-chart-bar)";

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
  monthAxisLabel: string;
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
  monthAxisLabel,
  dividendLabel,
  cumulativeLabel,
}: Props) {
  return (
    <div className="h-80 w-full">
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
            label={{
              value: monthAxisLabel,
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "var(--muted-foreground)",
            }}
            height={42}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickFormatter={(v) => fmt.format(v as number)}
            width={64}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickFormatter={(v) => fmt.format(v as number)}
            width={64}
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
          <Legend
            verticalAlign="bottom"
            iconType="rect"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          <Bar
            yAxisId="left"
            dataKey="monthPayment"
            fill={CHART_BAR_COLOR}
            name={dividendLabel}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePayment"
            stroke={CHART_BAR_COLOR}
            fill={CHART_BAR_COLOR}
            fillOpacity={0.2}
            strokeWidth={2}
            name={cumulativeLabel}
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
      <div className="mb-1 font-medium">
        {monthLabel} {label}
      </div>
      {typeof div === "number" && (
        <div className="tnum flex items-center gap-2">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: CHART_BAR_COLOR }}
          />
          <span className="text-muted-foreground">{dividendLabel}:</span>
          <span>{fmt.format(div)}</span>
        </div>
      )}
      {typeof cum === "number" && (
        <div className="tnum flex items-center gap-2">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: CHART_BAR_COLOR, opacity: 0.4 }}
          />
          <span className="text-muted-foreground">{cumulativeLabel}:</span>
          <span>{fmt.format(cum)}</span>
        </div>
      )}
    </div>
  );
}
