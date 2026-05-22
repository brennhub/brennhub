"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/switch";
import { NumberStepper } from "@/components/number-stepper";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { useCurrency } from "@/components/currency-provider";
import {
  formatCurrency,
  parseCurrency,
  type Currency,
} from "@/lib/format/currency";
import { cn } from "@/lib/utils";
import { SplitSellDetail } from "./split-sell-detail";

const STORAGE_KEY = "brennhub:stock-sim:split-sell";

const N_MIN = 2;
const N_MAX_HARD = 50;
const N_DEFAULT = 5;
const RISE_INTERVAL_DEFAULT = "5";
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 100;
const RISE_MIN = 0;
const RISE_MAX = 100;
const TAX_MAX = 50;

type TaxType = "short" | "long" | "custom";

function isTaxType(v: unknown): v is TaxType {
  return v === "short" || v === "long" || v === "custom";
}

type StoredState = {
  ticker: string;
  holdings: string;
  startPrice: string;
  rounds: string;
  riseInterval: string;
  avgCost: string;
  taxRate: string;
  taxType: TaxType;
  weightEnabled: boolean;
  firstWeightPct: string;
  lastCompletedRound: number;
  forceFirstShare: boolean;
};

type Round = {
  n: number;
  price: number;
  cumulativeRisePct: number;
  shares: number;
  cumulativeShares: number;
  sellAmount: number;
  cumulativeSellAmount: number;
  realizedPnl: number;
};

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Mirror of the split-buy weighting: Martingale ratio (2x default) or the
// symmetric 0-100 tilt. Later rounds (higher sell price) get the larger share.
function computeNormalizedWeights(
  count: number,
  weightEnabled: boolean,
  firstWeightPct: string,
): number[] {
  const effectiveR = weightEnabled
    ? (100 - clamp(parseNum(firstWeightPct), WEIGHT_MIN, WEIGHT_MAX)) / 50
    : 2;
  const weights = Array.from({ length: count }, (_, k) =>
    Math.pow(effectiveR, k),
  );
  const weightSum = weights.reduce((s, w) => s + w, 0);
  return weightSum > 0 ? weights.map((w) => w / weightSum) : weights;
}

// Largest-remainder integer allocation: splits the held share count across
// rounds by weight so the parts sum back to exactly `total`.
function allocateShares(total: number, weights: number[]): number[] {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0);
  }
  const raw = weights.map((w) => total * w);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = total - floored.reduce((s, v) => s + v, 0);
  const byFrac = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floored];
  for (let k = 0; k < byFrac.length && remainder > 0; k++) {
    result[byFrac[k].i] += 1;
    remainder -= 1;
  }
  return result;
}

export function SplitSellCalculator() {
  const t = useMessages().stockSim.splitSell;
  const { locale } = useLocale();
  const { currency, rate } = useCurrency();

  const [ticker, setTicker] = useState<string>("");
  const [holdings, setHoldings] = useState<string>("");
  const [startPrice, setStartPrice] = useState<string>("");
  const [rounds, setRounds] = useState<string>(String(N_DEFAULT));
  const [riseInterval, setRiseInterval] = useState<string>(
    RISE_INTERVAL_DEFAULT,
  );
  const [avgCost, setAvgCost] = useState<string>("");
  const [taxRate, setTaxRate] = useState<string>("0");
  const [taxType, setTaxType] = useState<TaxType>("custom");
  const [weightEnabled, setWeightEnabled] = useState<boolean>(false);
  const [firstWeightPct, setFirstWeightPct] = useState<string>("50");
  const [forceFirstShare, setForceFirstShare] = useState<boolean>(true);
  const [lastCompletedRound, setLastCompletedRound] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  const prevCurrencyRef = useRef<Currency | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        if (typeof parsed.ticker === "string") setTicker(parsed.ticker);
        if (typeof parsed.holdings === "string") setHoldings(parsed.holdings);
        if (typeof parsed.startPrice === "string")
          setStartPrice(parsed.startPrice);
        if (typeof parsed.rounds === "string") setRounds(parsed.rounds);
        if (typeof parsed.riseInterval === "string")
          setRiseInterval(parsed.riseInterval);
        if (typeof parsed.avgCost === "string") setAvgCost(parsed.avgCost);
        if (typeof parsed.taxRate === "string") setTaxRate(parsed.taxRate);
        if (isTaxType(parsed.taxType)) setTaxType(parsed.taxType);
        if (typeof parsed.weightEnabled === "boolean")
          setWeightEnabled(parsed.weightEnabled);
        if (typeof parsed.firstWeightPct === "string")
          setFirstWeightPct(parsed.firstWeightPct);
        if (typeof parsed.forceFirstShare === "boolean")
          setForceFirstShare(parsed.forceFirstShare);
        if (typeof parsed.lastCompletedRound === "number")
          setLastCompletedRound(parsed.lastCompletedRound);
      }
    } catch {
      // corrupt
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          ticker,
          holdings,
          startPrice,
          rounds,
          riseInterval,
          avgCost,
          taxRate,
          taxType,
          weightEnabled,
          firstWeightPct,
          forceFirstShare,
          lastCompletedRound,
        } satisfies StoredState),
      );
    } catch {
      // quota
    }
  }, [
    hydrated,
    ticker,
    holdings,
    startPrice,
    rounds,
    riseInterval,
    avgCost,
    taxRate,
    taxType,
    weightEnabled,
    firstWeightPct,
    forceFirstShare,
    lastCompletedRound,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (prevCurrencyRef.current === null) {
      prevCurrencyRef.current = currency;
      return;
    }
    if (prevCurrencyRef.current === currency) return;

    const oldCurrency = prevCurrencyRef.current;
    const convert = (raw: string): string => {
      if (!raw) return raw;
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n === 0) return raw;
      const usd = oldCurrency === "usd" ? n : n / rate;
      const newVal = currency === "usd" ? usd : usd * rate;
      return currency === "usd"
        ? newVal.toFixed(2)
        : Math.round(newVal).toString();
    };

    // holdings is a share count (currency-independent) — only prices convert.
    setStartPrice(convert(startPrice));
    setAvgCost(convert(avgCost));
    prevCurrencyRef.current = currency;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, rate, hydrated]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const fmtInt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const fmtCurrency = useMemo(
    () => (n: number) => formatCurrency(n, currency, rate),
    [currency, rate],
  );

  const startPriceUSD = useMemo(
    () => parseCurrency(startPrice, currency, rate),
    [startPrice, currency, rate],
  );
  const avgCostUSD = useMemo(
    () => parseCurrency(avgCost, currency, rate),
    [avgCost, currency, rate],
  );

  const formatStartPriceDisplay = (raw: string): string => {
    if (!raw) return "";
    const usd = parseCurrency(raw, currency, rate);
    if (usd === 0) return raw;
    return fmtCurrency(usd);
  };
  const formatAvgCostDisplay = (raw: string): string => {
    if (!raw) return "";
    const usd = parseCurrency(raw, currency, rate);
    if (usd === 0) return raw;
    return fmtCurrency(usd);
  };
  const formatHoldingsDisplay = (raw: string): string =>
    raw ? fmtInt.format(parseNum(raw)) : "";
  const formatNWithUnit = (raw: string): string =>
    raw ? `${raw} ${t.unitN}` : "";
  const formatPercent = (raw: string): string => (raw ? `${raw} %` : "");

  const nNum = useMemo(() => {
    const n = Math.floor(parseNum(rounds));
    if (!Number.isFinite(n) || n < N_MIN) return N_DEFAULT;
    return Math.min(n, N_MAX_HARD);
  }, [rounds]);

  useEffect(() => {
    if (lastCompletedRound > nNum) {
      setLastCompletedRound(nNum);
    } else if (lastCompletedRound < 0) {
      setLastCompletedRound(0);
    }
  }, [nNum, lastCompletedRound]);

  const computed = useMemo(() => {
    const riseNum = parseNum(riseInterval);
    const taxRateNum = parseNum(taxRate);
    const holdingsNum = Math.floor(parseNum(holdings));

    const valid =
      holdingsNum > 0 &&
      startPriceUSD > 0 &&
      nNum >= N_MIN &&
      riseNum > 0;
    if (!valid) {
      return {
        valid: false,
        rounds: [] as Round[],
        totalProceeds: 0,
        totalShares: 0,
        avgSellPrice: 0,
        realizedProfit: 0,
        taxAmount: 0,
        afterTaxProfit: 0,
        taxRatePct: taxRateNum,
      };
    }

    const normalizedWeights = computeNormalizedWeights(
      nNum,
      weightEnabled,
      firstWeightPct,
    );
    const shareAlloc = allocateShares(holdingsNum, normalizedWeights);

    // forceFirstShare: guarantee leading rounds sell >= 1 share, then trim
    // from the back so the parts still sum to exactly the held count.
    if (forceFirstShare) {
      for (let n = 0; n < nNum; n++) {
        if (shareAlloc[n] === 0) shareAlloc[n] = 1;
        else break;
      }
      let total = shareAlloc.reduce((s, v) => s + v, 0);
      let safety = nNum * 100;
      while (total > holdingsNum && safety-- > 0) {
        let trimmed = false;
        for (let i = nNum - 1; i >= 0; i--) {
          if (shareAlloc[i] > 0) {
            shareAlloc[i] -= 1;
            total -= 1;
            trimmed = true;
            break;
          }
        }
        if (!trimmed) break;
      }
    }

    const roundsArr: Round[] = [];
    let cumulativeShares = 0;
    let cumulativeSellAmount = 0;
    for (let n = 0; n < nNum; n++) {
      const price = startPriceUSD * (1 + (riseNum / 100) * n);
      const shares = shareAlloc[n];
      const sellAmount = shares * price;
      cumulativeShares += shares;
      cumulativeSellAmount += sellAmount;
      const realizedPnl = shares * (price - avgCostUSD);
      roundsArr.push({
        n: n + 1,
        price,
        cumulativeRisePct: riseNum * n,
        shares,
        cumulativeShares,
        sellAmount,
        cumulativeSellAmount,
        realizedPnl,
      });
    }

    const last = roundsArr[roundsArr.length - 1];
    const totalProceeds = last?.cumulativeSellAmount ?? 0;
    const totalShares = last?.cumulativeShares ?? 0;
    const avgSellPrice = totalShares > 0 ? totalProceeds / totalShares : 0;
    const realizedProfit = roundsArr.reduce((s, r) => s + r.realizedPnl, 0);
    const taxAmount = realizedProfit * (taxRateNum / 100);
    const afterTaxProfit = realizedProfit - taxAmount;

    return {
      valid: true,
      rounds: roundsArr,
      totalProceeds,
      totalShares,
      avgSellPrice,
      realizedProfit,
      taxAmount,
      afterTaxProfit,
      taxRatePct: taxRateNum,
    };
  }, [
    holdings,
    startPriceUSD,
    avgCostUSD,
    nNum,
    riseInterval,
    taxRate,
    weightEnabled,
    firstWeightPct,
    forceFirstShare,
  ]);

  const profitColor =
    computed.realizedProfit === 0
      ? ""
      : computed.realizedProfit > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

  const afterTaxColor =
    computed.afterTaxProfit === 0
      ? ""
      : computed.afterTaxProfit > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

  const taxColor =
    computed.taxAmount > 0 ? "text-[var(--color-loss)]" : "";

  const zeroShareWarning = useMemo(() => {
    if (!computed.valid) return null;
    const zeros = computed.rounds
      .filter((r) => r.shares === 0)
      .map((r) => r.n);
    if (zeros.length === 0) return null;
    return {
      start: zeros[0],
      end: zeros[zeros.length - 1],
      count: zeros.length,
    };
  }, [computed]);

  const handleRowClick = (n: number) => {
    setLastCompletedRound(n);
  };

  const handleRoundsChange = (text: string) => {
    setRounds(text.replace(/[^\d]/g, ""));
  };

  const handleRoundsBlur = () => {
    const n = parseInt(rounds, 10);
    if (!rounds || !Number.isFinite(n) || n < N_MIN) {
      setRounds(String(N_MIN));
    }
  };

  const handleRoundsStep = (newN: number) => {
    if (newN < N_MIN || newN > N_MAX_HARD) return;
    setRounds(String(newN));
  };

  const handleRiseStep = (newRise: number) => {
    if (newRise < RISE_MIN || newRise > RISE_MAX) return;
    setRiseInterval(String(newRise));
  };

  const handleTaxStep = (newTax: number) => {
    if (newTax < 0 || newTax > TAX_MAX) return;
    setTaxRate(String(newTax));
    setTaxType("custom");
  };

  const handleTaxRateChange = (text: string) => {
    setTaxRate(text);
    setTaxType("custom");
  };

  const handleFirstWeightStep = (newWeight: number) => {
    if (newWeight < WEIGHT_MIN || newWeight > WEIGHT_MAX) return;
    setFirstWeightPct(String(newWeight));
  };

  const handleTermClick = (type: "short" | "long") => {
    if (taxType === type) {
      setTaxType("custom");
      setTaxRate("0");
      return;
    }
    setTaxType(type);
    setTaxRate(type === "short" ? "24" : "15");
  };

  const handleHoldingsChange = (text: string) => {
    setHoldings(text.replace(/[^\d]/g, ""));
  };

  const handleHoldingsStep = (newHoldings: number) => {
    if (newHoldings < 0) return;
    setHoldings(String(newHoldings));
  };

  const handleStartPriceStep = (newPrice: number) => {
    if (newPrice < 0) return;
    setStartPrice(String(newPrice));
  };

  const handleAvgCostStep = (newCost: number) => {
    if (newCost < 0) return;
    setAvgCost(String(newCost));
  };

  // Reset every plan-card input back to defaults. lastCompletedRound (detail
  // card) and global toggles (color/currency) intentionally stay untouched.
  const resetPlan = () => {
    setTicker("");
    setHoldings("");
    setStartPrice("");
    setRounds(String(N_DEFAULT));
    setRiseInterval(RISE_INTERVAL_DEFAULT);
    setAvgCost("");
    setTaxRate("0");
    setTaxType("custom");
    setWeightEnabled(false);
    setFirstWeightPct("50");
    setForceFirstShare(true);
  };

  const priceSteps =
    currency === "usd"
      ? { small: 1, big: 10 }
      : { small: 1000, big: 10_000 };

  const handleExportCsv = () => {
    if (!computed.valid) return;
    const header = [
      t.colRound,
      t.colPrice,
      t.colRisePct,
      t.colShares,
      t.colCumShares,
      t.colSellAmount,
      t.colCumSellAmount,
      t.colRealizedPnl,
    ].join(",");
    const fmtNum = (usdValue: number): string => {
      const display = currency === "usd" ? usdValue : usdValue * rate;
      return display.toFixed(currency === "usd" ? 2 : 0);
    };
    const lines = computed.rounds.map((r) =>
      [
        r.n,
        fmtNum(r.price),
        r.cumulativeRisePct.toFixed(2),
        r.shares,
        r.cumulativeShares,
        fmtNum(r.sellAmount),
        fmtNum(r.cumulativeSellAmount),
        fmtNum(r.realizedPnl),
      ].join(","),
    );
    const csv = "﻿" + [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `split-sell-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inputCard = (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{t.inputTitle}</CardTitle>
          <Button variant="outline" size="sm" onClick={resetPlan}>
            <RotateCcw className="size-3" />
            {t.legendReset}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label={t.tickerHeader} htmlFor="ss-ticker">
          <Input
            id="ss-ticker"
            placeholder={t.tickerPlaceholder}
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          />
        </Field>
        <Field label={t.holdingsHeader} htmlFor="ss-holdings">
          <NumberStepper
            id="ss-holdings"
            value={holdings}
            onInputChange={handleHoldingsChange}
            onStep={handleHoldingsStep}
            displayFormatter={formatHoldingsDisplay}
            min={0}
            smallStep={1}
            bigStep={100}
            inputMode="numeric"
            placeholder={t.holdingsPlaceholder}
            aria-label={t.holdingsHeader}
          />
        </Field>
        <Field label={t.startPriceHeader} htmlFor="ss-start">
          <NumberStepper
            id="ss-start"
            value={startPrice}
            onInputChange={setStartPrice}
            onStep={handleStartPriceStep}
            displayFormatter={formatStartPriceDisplay}
            min={0}
            smallStep={priceSteps.small}
            bigStep={priceSteps.big}
            inputMode="decimal"
            placeholder={t.startPricePlaceholder}
            aria-label={t.startPriceHeader}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label={t.nLabel} htmlFor="ss-rounds">
            <NumberStepper
              id="ss-rounds"
              value={rounds}
              onInputChange={handleRoundsChange}
              onInputBlur={handleRoundsBlur}
              onStep={handleRoundsStep}
              displayFormatter={formatNWithUnit}
              min={N_MIN}
              max={N_MAX_HARD}
              smallStep={1}
              bigStep={10}
              inputMode="numeric"
              placeholder={t.nPlaceholder}
              aria-label={t.nLabel}
              maxReachedMessage={t.stepperNMax}
              minReachedMessage={t.stepperNMin}
            />
          </Field>
          <Field label={t.riseIntervalLabel} htmlFor="ss-rise">
            <NumberStepper
              id="ss-rise"
              value={riseInterval}
              onInputChange={setRiseInterval}
              onStep={handleRiseStep}
              displayFormatter={formatPercent}
              min={RISE_MIN}
              max={RISE_MAX}
              smallStep={1}
              bigStep={5}
              inputMode="decimal"
              placeholder={t.riseIntervalPlaceholder}
              aria-label={t.riseIntervalLabel}
              maxReachedMessage={t.stepperRiseMax}
              minReachedMessage={t.stepperRiseMin}
            />
          </Field>
          <Field label={t.avgCostLabel} htmlFor="ss-avg-cost">
            <NumberStepper
              id="ss-avg-cost"
              value={avgCost}
              onInputChange={setAvgCost}
              onStep={handleAvgCostStep}
              displayFormatter={formatAvgCostDisplay}
              min={0}
              smallStep={priceSteps.small}
              bigStep={priceSteps.big}
              inputMode="decimal"
              placeholder={t.avgCostPlaceholder}
              aria-label={t.avgCostLabel}
            />
          </Field>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="ss-tax-rate" className="text-sm">
              {t.taxRateLabel}
            </Label>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant={taxType === "short" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTermClick("short")}
              >
                {t.taxTypeShortTerm}
              </Button>
              <InfoTooltip text={t.taxTooltipShortTerm} />
              <Button
                type="button"
                variant={taxType === "long" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTermClick("long")}
              >
                {t.taxTypeLongTerm}
              </Button>
              <InfoTooltip text={t.taxTooltipLongTerm} />
            </div>
          </div>
          <NumberStepper
            id="ss-tax-rate"
            value={taxRate}
            onInputChange={handleTaxRateChange}
            onStep={handleTaxStep}
            displayFormatter={formatPercent}
            min={0}
            max={TAX_MAX}
            smallStep={1}
            bigStep={5}
            inputMode="decimal"
            aria-label={t.taxRateLabel}
            maxReachedMessage={t.stepperTaxMax}
          />
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Switch
              id="ss-weight-toggle"
              checked={weightEnabled}
              onCheckedChange={setWeightEnabled}
              aria-label={t.weightToggle}
            />
            <Label
              htmlFor="ss-weight-toggle"
              className="cursor-pointer text-sm"
            >
              {t.weightToggle}
            </Label>
            <InfoTooltip text={t.weightTooltip} />
          </div>
          <p className="text-xs text-muted-foreground">{t.weightHint}</p>
          {weightEnabled && (
            <div>
              <Label htmlFor="ss-first-weight" className="text-sm">
                {t.firstWeightLabel}
              </Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <NumberStepper
                  id="ss-first-weight"
                  value={firstWeightPct}
                  onInputChange={setFirstWeightPct}
                  onStep={handleFirstWeightStep}
                  min={WEIGHT_MIN}
                  max={WEIGHT_MAX}
                  smallStep={1}
                  bigStep={10}
                  inputMode="decimal"
                  placeholder={t.firstWeightPlaceholder}
                  aria-label={t.firstWeightLabel}
                  maxReachedMessage={t.stepperWeightMax}
                  className="max-w-40"
                />
                <span className="text-xs text-muted-foreground">
                  {t.weightEqualBenchmark}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Switch
            id="ss-force-first-share"
            checked={forceFirstShare}
            onCheckedChange={setForceFirstShare}
            aria-label={t.forceFirstShareLabel}
          />
          <Label
            htmlFor="ss-force-first-share"
            className="cursor-pointer text-sm"
          >
            {t.forceFirstShareLabel}
          </Label>
          <InfoTooltip text={t.forceFirstShareTooltip} />
        </div>

        {zeroShareWarning && (
          <p className="border-t border-border pt-3 text-sm text-amber-600 dark:text-amber-400">
            ⚠️{" "}
            {zeroShareWarning.count === 1
              ? t.zeroShareWarningSingle.replace(
                  "{n}",
                  String(zeroShareWarning.start),
                )
              : t.zeroShareWarningRange
                  .replace("{start}", String(zeroShareWarning.start))
                  .replace("{end}", String(zeroShareWarning.end))}
          </p>
        )}
        {!computed.valid && (
          <p className="border-t border-border pt-3 text-sm text-amber-600 dark:text-amber-400">
            ⚠️ {t.invalidInputHint}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const summaryCard = (
    <Card className="self-start lg:sticky lg:top-4">
      <CardHeader>
        <CardTitle>{t.summaryTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">
          <SummaryRow
            label={t.totalProceedsLabel}
            value={computed.valid ? fmtCurrency(computed.totalProceeds) : "—"}
          />
          <SummaryRow
            label={t.totalSharesLabel}
            value={
              computed.valid
                ? locale === "ko"
                  ? `${fmtInt.format(computed.totalShares)} 주`
                  : fmtInt.format(computed.totalShares)
                : "—"
            }
          />
          <SummaryRow
            label={t.avgSellPriceLabel}
            value={computed.valid ? fmtCurrency(computed.avgSellPrice) : "—"}
          />
          <SummaryRow
            label={t.realizedProfitLabel}
            value={
              computed.valid ? (
                <span className={cn(profitColor)}>
                  {computed.realizedProfit > 0 ? "+" : ""}
                  {fmtCurrency(computed.realizedProfit)}
                </span>
              ) : (
                "—"
              )
            }
          />
          <SummaryRow
            label={t.taxAmountLabel}
            value={
              computed.valid ? (
                <span className={cn(taxColor)}>
                  {computed.taxAmount > 0 ? "−" : ""}
                  {fmtCurrency(computed.taxAmount)}
                </span>
              ) : (
                "—"
              )
            }
          />
          <SummaryRow
            label={t.afterTaxRealizedLabel}
            value={
              computed.valid ? (
                <span className={cn(afterTaxColor)}>
                  {computed.afterTaxProfit > 0 ? "+" : ""}
                  {fmtCurrency(computed.afterTaxProfit)}
                </span>
              ) : (
                "—"
              )
            }
          />
        </dl>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {inputCard}
        {summaryCard}
      </div>

      <SplitSellDetail
        rounds={computed.rounds}
        fmt={fmt}
        fmtInt={fmtInt}
        fmtCurrency={fmtCurrency}
        lastCompletedRound={lastCompletedRound}
        onRoundClick={handleRowClick}
        onReset={() => setLastCompletedRound(0)}
        onExportCsv={handleExportCsv}
        tableTitle={t.tableTitle}
        legendCompleted={t.legendCompleted}
        legendNextSell={t.legendNextSell}
        legendReset={t.legendReset}
        exportCsvLabel={t.exportCsvLabel}
        colRound={t.colRound}
        colPrice={t.colPrice}
        colRisePct={t.colRisePct}
        colShares={t.colShares}
        colCumShares={t.colCumShares}
        colSellAmount={t.colSellAmount}
        colCumSellAmount={t.colCumSellAmount}
        colRealizedPnl={t.colRealizedPnl}
        emptyHint={t.tableEmptyHint}
      />
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
      </Label>
      {children}
    </div>
  );
}

function SummaryRow({
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

function InfoTooltip({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="group relative inline-flex"
      aria-label={text}
    >
      <Info className="size-3.5 cursor-help text-muted-foreground" />
      <span className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
        {text}
      </span>
    </button>
  );
}
