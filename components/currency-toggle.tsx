"use client";

import { useCurrency } from "@/components/currency-provider";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const CURRENCIES = ["krw", "usd"] as const;

export function CurrencyToggle() {
  const { currency, setCurrency, rate, rateDate, isManualRate } = useCurrency();
  const t = useMessages().stockSim;

  const tooltipText = isManualRate
    ? t.exchangeRateTooltipManual.replace("{rate}", rate.toFixed(2))
    : t.exchangeRateTooltip
        .replace("{rate}", rate.toFixed(2))
        .replace("{date}", rateDate ?? "—");

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t.currencyLabel}</span>
      <div className="group relative inline-flex items-center">
        <div
          className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
          role="group"
          aria-label="Currency"
        >
          {CURRENCIES.map((c) => {
            const active = c === currency;
            const label = c === "usd" ? t.currencyUsd : t.currencyKrw;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={active}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="pointer-events-none invisible absolute right-0 top-full z-50 mt-2 w-60 max-w-[80vw] rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100">
          {tooltipText}
        </span>
      </div>
    </div>
  );
}
