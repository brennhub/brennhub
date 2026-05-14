"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

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
  shares: string;
  dividend: string;
  frequency: Frequency;
  invested: string;
};

type StoredState = { rows: Row[] };

const STORAGE_KEY = "brennhub:stock-sim:dividend";

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
    shares: "",
    dividend: "",
    frequency: "quarterly",
    invested: "",
  };
}

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function isFrequency(v: unknown): v is Frequency {
  return typeof v === "string" && (FREQUENCIES as readonly string[]).includes(v);
}

export function DividendCalculator() {
  const t = useMessages().stockSim.dividend;
  const { locale } = useLocale();
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredState;
        if (Array.isArray(parsed.rows) && parsed.rows.length > 0) {
          const safe = parsed.rows.map((r) => ({
            id: typeof r.id === "string" ? r.id : newId(),
            ticker: typeof r.ticker === "string" ? r.ticker : "",
            shares: typeof r.shares === "string" ? r.shares : "",
            dividend: typeof r.dividend === "string" ? r.dividend : "",
            frequency: isFrequency(r.frequency) ? r.frequency : "quarterly",
            invested: typeof r.invested === "string" ? r.invested : "",
          }));
          setRows(safe);
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
        JSON.stringify({ rows } satisfies StoredState),
      );
    } catch {
      // quota / private mode — selection still applies in-session
    }
  }, [rows, hydrated]);

  const computed = useMemo(() => {
    type Per = {
      row: Row;
      annual: number;
      monthly: number;
      yieldPct: number | null;
      contributing: boolean;
    };
    const per: Per[] = rows.map((r) => {
      const shares = parseNum(r.shares);
      const dividend = parseNum(r.dividend);
      const invested = parseNum(r.invested);
      const contributing = shares > 0 && dividend > 0;
      const annual = contributing
        ? shares * dividend * FREQ_MULTIPLIER[r.frequency]
        : 0;
      const monthly = annual / 12;
      const yieldPct =
        invested > 0 && annual > 0 ? (annual / invested) * 100 : null;
      return { row: r, annual, monthly, yieldPct, contributing };
    });
    const totalAnnual = per.reduce((sum, p) => sum + p.annual, 0);
    const totalMonthly = totalAnnual / 12;
    const contributingPer = per.filter((p) => p.contributing);
    const allHaveInvested =
      contributingPer.length > 0 &&
      contributingPer.every((p) => parseNum(p.row.invested) > 0);
    const totalInvested = contributingPer.reduce(
      (sum, p) => sum + parseNum(p.row.invested),
      0,
    );
    const portfolioYield =
      allHaveInvested && totalInvested > 0
        ? (totalAnnual / totalInvested) * 100
        : null;
    return { per, totalAnnual, totalMonthly, portfolioYield };
  }, [rows]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const formatNum = (n: number): string => fmt.format(n);

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

  // Native <select> styled to match the shared Input component.
  const selectClass = cn(
    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base md:text-sm",
    "transition-colors outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    "dark:bg-input/30",
  );

  const colsGrid =
    "lg:grid lg:grid-cols-[1.2fr_1fr_1fr_1.3fr_1fr_auto] lg:gap-2 lg:items-center";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.inputTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "hidden px-1 text-xs font-medium text-muted-foreground",
              colsGrid,
            )}
          >
            <span>{t.tickerHeader}</span>
            <span>{t.sharesHeader}</span>
            <span>{t.dividendHeader}</span>
            <span>{t.frequencyHeader}</span>
            <span>{t.investedHeader}</span>
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
                  onChange={(e) => updateRow(r.id, { ticker: e.target.value })}
                />
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.sharesPlaceholder}
                  aria-label={t.sharesHeader}
                  value={r.shares}
                  onChange={(e) => updateRow(r.id, { shares: e.target.value })}
                  className="tnum"
                />
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.dividendPlaceholder}
                  aria-label={t.dividendHeader}
                  value={r.dividend}
                  onChange={(e) =>
                    updateRow(r.id, { dividend: e.target.value })
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
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.investedPlaceholder}
                  aria-label={t.investedHeader}
                  value={r.invested}
                  onChange={(e) =>
                    updateRow(r.id, { invested: e.target.value })
                  }
                  className="tnum"
                />
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
                  value={formatNum(computed.totalMonthly)}
                />
                <ResultRow
                  label={t.annualTotal}
                  value={formatNum(computed.totalAnnual)}
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
                            {t.monthlyShort} {formatNum(p.monthly)}
                          </span>
                          <span className="text-muted-foreground">/</span>
                          <span className="tnum">
                            {t.annualShort} {formatNum(p.annual)}
                          </span>
                          {p.yieldPct !== null && (
                            <span className="tnum text-muted-foreground">
                              ({t.yieldShort} {formatNum(p.yieldPct)}%)
                            </span>
                          )}
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
