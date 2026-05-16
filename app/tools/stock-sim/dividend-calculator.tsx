"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download, Info, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { useCurrency } from "@/components/currency-provider";
import { formatCurrency } from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import {
  CHART_PALETTE,
  DividendCashFlowChart,
} from "./dividend-cash-flow-chart";
import { DividendMonthlyDetail } from "./dividend-monthly-detail";
import { DividendPerTicker } from "./dividend-per-ticker";

type Frequency = "monthly" | "quarterly" | "semiAnnual" | "annual";

const FREQUENCIES: readonly Frequency[] = [
  "monthly",
  "quarterly",
  "semiAnnual",
  "annual",
] as const;

const FREQ_MULTIPLIER: Record<Frequency, number> = {
  monthly: 12,
  quarterly: 4,
  semiAnnual: 2,
  annual: 1,
};

type Row = {
  id: string;
  ticker: string;
  equity: string;
  currentPrice: string;
  yieldPercent: string;
  frequency: Frequency;
};

type StoredState = {
  rows: Row[];
  months?: string;
  dripEnabled?: boolean;
};

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

const STORAGE_KEY = "brennhub:stock-sim:dividend";
const DEFAULT_MONTHS = "12";
const DEFAULT_MONTHS_NUM = 12;
const MONTHS_MIN = 1;
const MONTHS_MAX = 360; // 30 years
const PERIOD_MIN_YEARS = 0.5;
const PERIOD_MAX_YEARS = 30;
const QUICK_PERIOD_YEARS: readonly number[] = [1, 3, 5, 10, 20, 30] as const;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function emptyRow(): Row {
  return {
    id: newId(),
    ticker: "",
    equity: "",
    currentPrice: "",
    yieldPercent: "",
    frequency: "quarterly",
  };
}

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function isFrequency(v: unknown): v is Frequency {
  return (
    typeof v === "string" && (FREQUENCIES as readonly string[]).includes(v)
  );
}

function migrateRow(raw: unknown): Row {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const oldInvested = typeof obj.invested === "string" ? obj.invested : "";
  return {
    id: typeof obj.id === "string" ? obj.id : newId(),
    ticker: typeof obj.ticker === "string" ? obj.ticker : "",
    equity: typeof obj.equity === "string" ? obj.equity : oldInvested,
    currentPrice:
      typeof obj.currentPrice === "string" ? obj.currentPrice : "",
    yieldPercent:
      typeof obj.yieldPercent === "string" ? obj.yieldPercent : "",
    frequency: isFrequency(obj.frequency) ? obj.frequency : "quarterly",
  };
}

export function DividendCalculator() {
  const t = useMessages().stockSim.dividend;
  const { locale } = useLocale();
  const { currency } = useCurrency();
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [months, setMonths] = useState<string>(DEFAULT_MONTHS);
  const [periodInputStr, setPeriodInputStr] = useState<string>(() =>
    String(DEFAULT_MONTHS_NUM / 12),
  );
  const [dripEnabled, setDripEnabled] = useState<boolean>(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          setRows(parsed.rows.map(migrateRow));
        }
        if (typeof parsed.months === "string") {
          setMonths(parsed.months);
          const m = parseNum(parsed.months);
          if (Number.isFinite(m) && m > 0) {
            setPeriodInputStr(String(m / 12));
          }
        }
        if (typeof parsed.dripEnabled === "boolean") {
          setDripEnabled(parsed.dripEnabled);
        }
      }
    } catch {
      // corrupt state — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rows,
          months,
          dripEnabled,
        } satisfies StoredState),
      );
    } catch {
      // quota / private mode — in-session only
    }
  }, [rows, months, dripEnabled, hydrated]);

  // Initial-state metrics for the Results card. These are a t=0 snapshot;
  // they intentionally do not reflect DRIP compounding (the chart + summary do).
  const computed = useMemo(() => {
    type Per = {
      row: Row;
      annual: number;
      monthly: number;
      yieldPct: number;
      contributing: boolean;
    };
    const per: Per[] = rows.map((r) => {
      const equity = parseNum(r.equity);
      const yieldPct = parseNum(r.yieldPercent);
      const contributing = equity > 0 && yieldPct > 0;
      const annual = contributing ? (equity * yieldPct) / 100 : 0;
      const monthly = annual / 12;
      return { row: r, annual, monthly, yieldPct, contributing };
    });
    const contributingPer = per.filter((p) => p.contributing);
    const totalAnnual = contributingPer.reduce((sum, p) => sum + p.annual, 0);
    const totalMonthly = totalAnnual / 12;
    const totalEquity = contributingPer.reduce(
      (sum, p) => sum + parseNum(p.row.equity),
      0,
    );
    const portfolioYield =
      contributingPer.length > 0 && totalEquity > 0
        ? (totalAnnual / totalEquity) * 100
        : null;
    return {
      per,
      totalAnnual,
      totalMonthly,
      portfolioYield,
      totalInitialEquity: totalEquity,
    };
  }, [rows]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const formatNum = (n: number): string => fmt.format(n);

  const fmtCurrency = useMemo(
    () => (n: number) => formatCurrency(n, currency),
    [currency],
  );

  const monthsNum = useMemo(() => {
    const n = Math.floor(parseNum(months));
    if (!Number.isFinite(n) || n < MONTHS_MIN) return DEFAULT_MONTHS_NUM;
    return Math.min(n, MONTHS_MAX);
  }, [months]);

  // DRIP-aware time series. Single source for chart, table, and summary.
  const series = useMemo<SeriesPoint[]>(() => {
    type RT = {
      id: string;
      yieldPct: number;
      currentPrice: number;
      multiplier: number;
      step: number;
      currentEquity: number;
      currentShares: number;
      contributing: boolean;
    };
    const runtime: RT[] = rows.map((r) => {
      const equity = parseNum(r.equity);
      const yieldPct = parseNum(r.yieldPercent);
      const cp = parseNum(r.currentPrice);
      const multiplier = FREQ_MULTIPLIER[r.frequency];
      const step = 12 / multiplier;
      const contributing = equity > 0 && yieldPct > 0;
      return {
        id: r.id,
        yieldPct,
        currentPrice: cp,
        multiplier,
        step,
        currentEquity: contributing ? equity : 0,
        currentShares: contributing && cp > 0 ? equity / cp : 0,
        contributing,
      };
    });

    const initialEquity = computed.totalInitialEquity;
    const points: SeriesPoint[] = [];
    let cumulative = 0;
    for (let m = 1; m <= monthsNum; m++) {
      let monthPayment = 0;
      const payments: Record<string, number> = {};
      for (const rt of runtime) {
        if (!rt.contributing) continue;
        let payment = 0;
        if (m % rt.step === 0) {
          payment =
            (rt.currentEquity * rt.yieldPct) / 100 / rt.multiplier;
          monthPayment += payment;
          if (dripEnabled) {
            rt.currentEquity += payment;
            if (rt.currentPrice > 0) {
              rt.currentShares += payment / rt.currentPrice;
            }
          }
        }
        payments[rt.id] = payment;
      }
      cumulative += monthPayment;
      const equities: Record<string, number> = {};
      for (const rt of runtime) {
        if (rt.contributing) equities[rt.id] = rt.currentEquity;
      }
      const totalEquity = runtime.reduce(
        (s, rt) => s + (rt.contributing ? rt.currentEquity : 0),
        0,
      );
      const totalShares = runtime.reduce(
        (s, rt) => s + (rt.contributing ? rt.currentShares : 0),
        0,
      );
      const monthlyYieldPct =
        initialEquity > 0 ? (monthPayment / initialEquity) * 100 : 0;
      const cumulativeYieldPct =
        initialEquity > 0 ? (cumulative / initialEquity) * 100 : 0;
      points.push({
        month: m,
        monthPayment,
        totalEquity,
        totalShares,
        cumulativePayment: cumulative,
        payments,
        equities,
        monthlyYieldPct,
        cumulativeYieldPct,
      });
    }
    return points;
  }, [rows, monthsNum, dripEnabled, computed.totalInitialEquity]);

  const summary = useMemo(() => {
    const last = series[series.length - 1];
    const totalDividend = last?.cumulativePayment ?? 0;
    const finalEquity = last?.totalEquity ?? 0;
    const roi =
      computed.totalInitialEquity > 0
        ? (totalDividend / computed.totalInitialEquity) * 100
        : null;
    return { totalDividend, roi, finalEquity };
  }, [series, computed.totalInitialEquity]);

  // Per-ticker chart bars. Empty tickers get "Stock N" fallback (sequential
  // across contributing rows). Order matches contributing row order.
  const contributingBars = useMemo(() => {
    let unnamed = 0;
    return computed.per
      .filter((p) => p.contributing)
      .map((p) => {
        const tick = p.row.ticker.trim();
        const label = tick || `Stock ${++unnamed}`;
        return { id: p.row.id, label };
      });
  }, [computed.per]);

  // Per-ticker detail card data. Pulls final equity from the last series
  // point so the card reflects DRIP compounding when enabled.
  const perTickerCards = useMemo(() => {
    const lastEquities = series[series.length - 1]?.equities ?? {};
    return contributingBars.map((bar, idx) => {
      const per = computed.per.find((p) => p.row.id === bar.id);
      const initialEquity = per ? parseNum(per.row.equity) : 0;
      return {
        id: bar.id,
        label: bar.label,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
        equity: initialEquity,
        monthly: per?.monthly ?? 0,
        annual: per?.annual ?? 0,
        yieldPct: per?.yieldPct ?? 0,
        finalEquity: dripEnabled
          ? (lastEquities[bar.id] ?? initialEquity)
          : null,
      };
    });
  }, [contributingBars, computed.per, series, dripEnabled]);

  const referenceLinks = useMemo(() => {
    const seen = new Set<string>();
    const links: Array<{ ticker: string; url: string }> = [];
    for (const p of computed.per) {
      if (!p.contributing) continue;
      const tick = p.row.ticker.trim();
      if (!tick) continue;
      const upper = tick.toUpperCase();
      if (seen.has(upper)) continue;
      seen.add(upper);
      links.push({
        ticker: upper,
        url: `https://finance.yahoo.com/quote/${encodeURIComponent(tick)}/dividends/`,
      });
    }
    return links;
  }, [computed.per]);

  const handleExportCsv = () => {
    const header =
      "Month,Shares,Equity,Monthly Dividend,Cumulative Dividend,Monthly Yield (%),Cumulative Yield (%)";
    const dataRows = series.map((p) =>
      [
        p.month,
        p.totalShares.toFixed(2),
        p.totalEquity.toFixed(2),
        p.monthPayment.toFixed(2),
        p.cumulativePayment.toFixed(2),
        p.monthlyYieldPct.toFixed(2),
        p.cumulativeYieldPct.toFixed(2),
      ].join(","),
    );
    const csv = [header, ...dataRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dividend-cashflow-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) {
      setRows([emptyRow()]);
    }
  };

  const handlePeriodInputChange = (raw: string) => {
    setPeriodInputStr(raw);
    if (raw === "") {
      setMonths("");
      return;
    }
    const y = parseFloat(raw);
    if (!Number.isFinite(y)) return;
    const clamped = Math.min(Math.max(y, PERIOD_MIN_YEARS), PERIOD_MAX_YEARS);
    setMonths(String(Math.round(clamped * 12)));
  };

  const handleChipClick = (years: number) => {
    setMonths(String(years * 12));
    setPeriodInputStr(String(years));
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id: string) => {
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== id),
    );
  };

  const hasAnyContrib = computed.per.some((p) => p.contributing);

  const selectClass = cn(
    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm",
    "transition-colors outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    "dark:bg-input/30",
  );

  const colsGrid =
    "lg:grid lg:grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr_auto] lg:gap-2 lg:items-center";

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>{t.inputTitle}</CardTitle>
              <Button variant="ghost" size="xs" onClick={handleReset}>
                <RotateCcw />
                {t.resetLabel}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "hidden px-1 text-xs font-medium text-muted-foreground",
                colsGrid,
              )}
            >
              <span>{t.tickerHeader}</span>
              <span>{t.equityHeader}</span>
              <span>{t.currentPriceHeader}</span>
              <span>{t.yieldHeader}</span>
              <span>{t.frequencyHeader}</span>
              <span className="w-8" />
            </div>

            <div className="space-y-3">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg border border-border p-3",
                    "lg:border-0 lg:p-0",
                    colsGrid,
                  )}
                >
                  <Input
                    placeholder={t.tickerPlaceholder}
                    aria-label={t.tickerHeader}
                    value={r.ticker}
                    onChange={(e) =>
                      updateRow(r.id, { ticker: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder={t.equityPlaceholder}
                    aria-label={t.equityHeader}
                    value={r.equity}
                    onChange={(e) =>
                      updateRow(r.id, { equity: e.target.value })
                    }
                    className="tnum"
                  />
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder={t.currentPricePlaceholder}
                    aria-label={t.currentPriceHeader}
                    value={r.currentPrice}
                    onChange={(e) =>
                      updateRow(r.id, { currentPrice: e.target.value })
                    }
                    className="tnum"
                  />
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder={t.yieldPlaceholder}
                    aria-label={t.yieldHeader}
                    value={r.yieldPercent}
                    onChange={(e) =>
                      updateRow(r.id, { yieldPercent: e.target.value })
                    }
                    className="tnum"
                  />
                  <select
                    aria-label={t.frequencyHeader}
                    value={r.frequency}
                    onChange={(e) => {
                      if (isFrequency(e.target.value)) {
                        updateRow(r.id, { frequency: e.target.value });
                      }
                    }}
                    className={selectClass}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {t.frequencyOptions[f]}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end lg:justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(r.id)}
                      disabled={rows.length <= 1}
                      aria-label={t.deleteRow}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addRow} className="w-full">
              {t.addRow}
            </Button>
          </CardContent>
        </Card>

        <Card className="self-start lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>{t.resultTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAnyContrib ? (
              <p className="text-sm text-muted-foreground">{t.emptyHint}</p>
            ) : (
              <div className="space-y-6">
                <dl className="space-y-3">
                  <ResultRow
                    label={t.monthlyAverage}
                    value={fmtCurrency(computed.totalMonthly)}
                  />
                  <ResultRow
                    label={t.annualTotal}
                    value={fmtCurrency(computed.totalAnnual)}
                  />
                  {computed.portfolioYield !== null && (
                    <ResultRow
                      label={t.portfolioYield}
                      value={`${formatNum(computed.portfolioYield)}%`}
                    />
                  )}
                </dl>

                <div className="space-y-2 border-t border-border pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t.breakdownTitle}
                  </h3>
                  <ul className="space-y-1.5 text-sm">
                    {computed.per
                      .filter((p) => p.contributing)
                      .map((p) => {
                        const tickerLabel =
                          p.row.ticker.trim() || t.unnamedTicker;
                        return (
                          <li
                            key={p.row.id}
                            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                          >
                            <span className="font-medium">{tickerLabel}</span>
                            <span className="text-muted-foreground">—</span>
                            <span className="tnum">
                              {t.monthlyShort} {fmtCurrency(p.monthly)}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="tnum">
                              {t.annualShort} {fmtCurrency(p.annual)}
                            </span>
                            <span className="tnum text-muted-foreground">
                              ({t.yieldShort} {formatNum(p.yieldPct)}%)
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {hasAnyContrib && perTickerCards.length >= 2 && (
        <DividendPerTicker
          tickers={perTickerCards}
          fmt={fmt}
          fmtCurrency={fmtCurrency}
          title={t.perTickerTitle}
          equityLabel={t.equityHeader}
          monthlyLabel={t.monthlyAverage}
          annualLabel={t.annualTotal}
          yieldLabel={t.yieldShort}
          finalEquityLabel={t.finalEquityLabel}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.cashFlowTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id="drip-toggle"
                checked={dripEnabled}
                onCheckedChange={setDripEnabled}
                aria-label={t.dripLabel}
              />
              <Label htmlFor="drip-toggle" className="cursor-pointer text-sm">
                {t.dripLabel}
              </Label>
              <button
                type="button"
                className="group relative inline-flex"
                aria-label={t.dripTooltip}
              >
                <Info className="size-3.5 cursor-help text-muted-foreground" />
                <span className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-2 w-64 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
                  {t.dripTooltip}
                </span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="cash-flow-period" className="text-sm">
                {t.periodLabel}
              </Label>
              <Input
                id="cash-flow-period"
                type="number"
                min={PERIOD_MIN_YEARS}
                max={PERIOD_MAX_YEARS}
                step={0.5}
                inputMode="decimal"
                value={periodInputStr}
                onChange={(e) => handlePeriodInputChange(e.target.value)}
                className="tnum max-w-20"
              />
              <span className="text-xs text-muted-foreground">
                {t.yearsUnit}
              </span>
              <div className="ml-1 flex flex-wrap gap-1">
                {QUICK_PERIOD_YEARS.map((y) => {
                  const active = Math.abs(monthsNum - y * 12) < 0.5;
                  return (
                    <Button
                      key={y}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="xs"
                      onClick={() => handleChipClick(y)}
                    >
                      {y}
                      {t.yearsUnit}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {!hasAnyContrib ? (
            <p className="text-sm text-muted-foreground">{t.emptyHint}</p>
          ) : (
            <div className="space-y-6">
              <DividendCashFlowChart
                series={series}
                bars={contributingBars}
                fmt={fmt}
                fmtCurrency={fmtCurrency}
                monthLabel={t.monthLabel}
                monthAxisLabel={t.monthAxisLabel}
                dividendLabel={t.dividendLabel}
                cumulativeLabel={t.cumulativeLabel}
              />

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {t.summaryTitle}
                  </h3>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleExportCsv}
                  >
                    <Download />
                    {t.exportCsvLabel}
                  </Button>
                </div>
                <dl className="space-y-3">
                  <ResultRow
                    label={t.totalDividendLabel}
                    value={fmtCurrency(summary.totalDividend)}
                  />
                  {summary.roi !== null && (
                    <ResultRow
                      label={t.roiLabel}
                      value={`${formatNum(summary.roi)}%`}
                    />
                  )}
                  {dripEnabled && (
                    <ResultRow
                      label={t.finalEquityLabel}
                      value={fmtCurrency(summary.finalEquity)}
                    />
                  )}
                </dl>
              </div>

              <DividendMonthlyDetail
                series={series}
                fmt={fmt}
                fmtCurrency={fmtCurrency}
                toggleLabel={t.monthlyDetailToggle}
                monthLabel={t.monthLabel}
                sharesLabel={t.sharesLabel}
                equityLabel={t.equityLabel}
                dividendLabel={t.dividendLabel}
                cumulativeLabel={t.cumulativeLabel}
                monthlyYieldLabel={t.monthlyYieldLabel}
                cumulativeYieldLabel={t.cumulativeYieldLabel}
              />

              <div className="space-y-3 border-t border-border pt-4 text-sm">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t.helpTitle}
                </h3>
                <p className="leading-relaxed">{t.exDateExplanation}</p>
                {referenceLinks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                      {t.referenceLinksTitle}
                    </h4>
                    <ul className="space-y-1">
                      {referenceLinks.map((link) => (
                        <li key={link.ticker}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {link.ticker} — Yahoo Finance ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="tnum text-lg font-medium">{value}</dd>
    </div>
  );
}
