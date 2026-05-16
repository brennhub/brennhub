"use client";

import { useMemo } from "react";
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

// Tailwind 500-series hex. Bars cycle through this palette by index when
// there are multiple tickers. Index 0 is blue-500 (same as --color-chart-bar)
// so single-ticker visuals stay consistent.
export const CHART_PALETTE: readonly string[] = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#f43f5e", // rose-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
] as const;

const ROTATE_THRESHOLD = 60;
const NEAR_ZERO = 0.005;

type SeriesPoint = {
  month: number;
  monthPayment: number;
  totalEquity: number;
  totalShares: number;
  cumulativePayment: number;
  payments: Record<string, number>;
  equities: Record<string, number>;
  monthlyYieldPct: number;
  cumulativeYieldPct: number;
};

type BarMeta = { id: string; label: string };

type Props = {
  series: SeriesPoint[];
  bars: BarMeta[];
  fmt: Intl.NumberFormat;
  fmtCurrency: (n: number) => string;
  monthLabel: string;
  monthAxisLabel: string;
  dividendLabel: string;
  cumulativeLabel: string;
};

type ChartTooltipPayloadEntry = {
  dataKey?: string | number;
  value?: number | string;
  name?: string | number;
  color?: string;
  fill?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<ChartTooltipPayloadEntry>;
  label?: string | number;
  fmtCurrency: (n: number) => string;
  monthLabel: string;
  dividendLabel: string;
  cumulativeLabel: string;
};

type XTickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: number | string };
};

export function DividendCashFlowChart({
  series,
  bars,
  fmt,
  fmtCurrency,
  monthLabel,
  monthAxisLabel,
  dividendLabel,
  cumulativeLabel,
}: Props) {
  // Captured once per mount. Chart is conditionally rendered only when there
  // are contributing rows, so it doesn't run during SSR — no hydration concern.
  const startDate = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  const rotated = series.length >= ROTATE_THRESHOLD;

  const renderXTick = (props: XTickProps) => {
    const x = typeof props.x === "number" ? props.x : Number(props.x ?? 0);
    const y = typeof props.y === "number" ? props.y : Number(props.y ?? 0);
    const raw = props.payload?.value;
    const idx = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(idx)) return <g />;
    const total = startDate.month + (idx - 1);
    const year = startDate.year + Math.floor(total / 12);
    const calMonth = ((total % 12) + 12) % 12;

    if (rotated) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={6}
            textAnchor="end"
            transform="rotate(-45)"
            fill="var(--muted-foreground)"
            fontSize="10"
          >
            {idx}
          </text>
          {calMonth === 0 && (
            <text
              x={0}
              y={0}
              dy={36}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize="10"
              fontWeight={500}
            >
              {year}
            </text>
          )}
        </g>
      );
    }

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize="11"
        >
          {idx}
        </text>
        {calMonth === 0 && (
          <text
            x={0}
            y={0}
            dy={26}
            textAnchor="middle"
            fill="var(--muted-foreground)"
            fontSize="10"
            fontWeight={500}
          >
            {year}
          </text>
        )}
      </g>
    );
  };

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
            interval={0}
            stroke="var(--border)"
            tick={renderXTick}
            label={{
              value: monthAxisLabel,
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "var(--muted-foreground)",
            }}
            height={rotated ? 70 : 52}
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
                fmtCurrency={fmtCurrency}
                monthLabel={monthLabel}
                dividendLabel={dividendLabel}
                cumulativeLabel={cumulativeLabel}
              />
            )}
          />
          <Legend
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />
          {bars.map((bar, idx) => (
            <Bar
              key={bar.id}
              yAxisId="left"
              dataKey={`payments.${bar.id}`}
              stackId="payments"
              fill={CHART_PALETTE[idx % CHART_PALETTE.length]}
              name={bars.length === 1 ? dividendLabel : bar.label}
              legendType="rect"
              radius={[2, 2, 0, 0]}
              isAnimationActive={false}
            />
          ))}
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePayment"
            stroke={CHART_BAR_COLOR}
            fill={CHART_BAR_COLOR}
            fillOpacity={0.2}
            strokeWidth={2}
            name={cumulativeLabel}
            legendType="line"
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
  fmtCurrency,
  monthLabel,
  dividendLabel,
  cumulativeLabel,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const allBars = payload.filter(
    (p) =>
      typeof p.dataKey === "string" && p.dataKey.startsWith("payments."),
  );
  const visibleBars = allBars.filter(
    (p) => typeof p.value === "number" && p.value > NEAR_ZERO,
  );
  const cumulative = payload.find((p) => p.dataKey === "cumulativePayment");
  const totalBar = allBars.reduce(
    (s, p) => s + (typeof p.value === "number" ? p.value : 0),
    0,
  );
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium">
        {monthLabel} {label}
      </div>
      {visibleBars.map((p) => (
        <div
          key={String(p.dataKey)}
          className="tnum flex items-center gap-2"
        >
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span>
            {fmtCurrency(typeof p.value === "number" ? p.value : 0)}
          </span>
        </div>
      ))}
      {allBars.length > 1 && (
        <div className="tnum mt-1 flex items-center gap-2 border-t border-border pt-1">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: "var(--muted-foreground)", opacity: 0.5 }}
          />
          <span className="text-muted-foreground">{dividendLabel}:</span>
          <span>{fmtCurrency(totalBar)}</span>
        </div>
      )}
      {cumulative && typeof cumulative.value === "number" && (
        <div className="tnum flex items-center gap-2">
          <span
            className="inline-block size-2 rounded-sm"
            style={{ background: CHART_BAR_COLOR, opacity: 0.4 }}
          />
          <span className="text-muted-foreground">{cumulativeLabel}:</span>
          <span>{fmtCurrency(cumulative.value)}</span>
        </div>
      )}
    </div>
  );
}
