"use client";

import { X } from "lucide-react";
import { useCurrency } from "@/components/currency-provider";
import { useMessages } from "@/lib/i18n/provider";
import { Input } from "@/components/ui/input";

export function ManualRateInput() {
  const { manualRateInput, setManualRateInput, apiRate } = useCurrency();
  const t = useMessages().stockSim;
  const placeholder = apiRate.toFixed(2);

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{t.rateLabel}</span>
      <Input
        type="text"
        inputMode="decimal"
        value={manualRateInput}
        onChange={(e) => setManualRateInput(e.target.value)}
        placeholder={placeholder}
        className="tnum h-7 w-24 text-right text-xs"
        aria-label={t.rateLabel}
      />
      <span className="text-xs text-muted-foreground">KRW</span>
      {manualRateInput !== "" && (
        <button
          type="button"
          onClick={() => setManualRateInput("")}
          aria-label="Clear manual rate"
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
