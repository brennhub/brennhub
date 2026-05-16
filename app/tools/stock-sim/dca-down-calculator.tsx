"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Info } from "lucide-react";
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
import { DcaDownDetail } from "./dca-down-detail";

const STORAGE_KEY = "brennhub:stock-sim:dca-down";

const N_MIN = 2;
const N_MAX_HARD = 100;
const N_DEFAULT = 10;
const WEIGHT_MIN = 0.01;
const WEIGHT_MAX = 95;
const DROP_MIN = 0;
const DROP_MAX = 50;

type StoredState = {
  ticker: string;
  budget: string;
  startPrice: string;
  rounds: string;
  dropInterval: string;
  targetReturn: string;
  taxRate: string;
  weightEnabled: boolean;
  firstWeightPct: string;
  lastCompletedRound: number;
  forceFirstShare: boolean;
  // Legacy
  finalDrop?: string;
  nextBuyRound?: number;
};

type Round = {
  n: number;
  price: number;
  cumulativeDropPct: number;
  avgPrice: number;
  shares: number;
  cumulativeShares: number;
  buyAmount: number;
  cumulativeBuyAmount: number;
  profit: number;
  targetPrice: number;
};

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// Solve for r given P% (first weight as percentage of total).
function solveR(P: number, N: number): number {
  if (N < 2) return 1;
  const target = 100 / P;
  if (Math.abs(target - N) < 1e-6) return 1;

  const sumAt = (r: number): number => {
    if (Math.abs(r - 1) < 1e-9) return N;
    return (1 - Math.pow(r, N)) / (1 - r);
  };

  let lo: number;
  let hi: number;
  if (target > N) {
    lo = 1.0;
    hi = 100;
    while (sumAt(hi) < target && hi < 1e9) hi *= 2;
  } else {
    lo = 1e-9;
    hi = 1.0;
  }

  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const s = sumAt(mid);
    if (s < target) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export function DcaDownCalculator() {
  const t = useMessages().stockSim.dcaDown;
  const { locale } = useLocale();
  const { currency, rate } = useCurrency();

  const [ticker, setTicker] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [startPrice, setStartPrice] = useState<string>("");
  const [rounds, setRounds] = useState<string>(String(N_DEFAULT));
  const [dropInterval, setDropInterval] = useState<string>("5");
  const [targetReturn, setTargetReturn] = useState<string>("30");
  const [taxRate, setTaxRate] = useState<string>("0");
  const [weightEnabled, setWeightEnabled] = useState<boolean>(false);
  const [firstWeightPct, setFirstWeightPct] = useState<string>("10");
  const [forceFirstShare, setForceFirstShare] = useState<boolean>(true);
  const [lastCompletedRound, setLastCompletedRound] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  // Track previous currency to detect toggles (needed for converting raw inputs).
  const prevCurrencyRef = useRef<Currency | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoredState>;
        if (typeof parsed.ticker === "string") setTicker(parsed.ticker);
        if (typeof parsed.budget === "string") setBudget(parsed.budget);
        if (typeof parsed.startPrice === "string")
          setStartPrice(parsed.startPrice);
        if (typeof parsed.rounds === "string") setRounds(parsed.rounds);
        if (typeof parsed.dropInterval === "string") {
          setDropInterval(parsed.dropInterval);
        } else if (
          typeof parsed.finalDrop === "string" &&
          typeof parsed.rounds === "string"
        ) {
          const fd = parseFloat(parsed.finalDrop);
          const n = parseInt(parsed.rounds, 10);
          if (Number.isFinite(fd) && fd > 0 && n >= 2) {
            setDropInterval((fd / (n - 1)).toFixed(2));
          }
        }
        if (typeof parsed.targetReturn === "string")
          setTargetReturn(parsed.targetReturn);
        if (typeof parsed.taxRate === "string") setTaxRate(parsed.taxRate);
        if (typeof parsed.weightEnabled === "boolean")
          setWeightEnabled(parsed.weightEnabled);
        if (typeof parsed.firstWeightPct === "string")
          setFirstWeightPct(parsed.firstWeightPct);
        if (typeof parsed.forceFirstShare === "boolean")
          setForceFirstShare(parsed.forceFirstShare);
        if (typeof parsed.lastCompletedRound === "number") {
          setLastCompletedRound(parsed.lastCompletedRound);
        } else if (typeof parsed.nextBuyRound === "number") {
          setLastCompletedRound(Math.max(0, parsed.nextBuyRound - 1));
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
          ticker,
          budget,
          startPrice,
          rounds,
          dropInterval,
          targetReturn,
          taxRate,
          weightEnabled,
          firstWeightPct,
          forceFirstShare,
          lastCompletedRound,
        } satisfies StoredState),
      );
    } catch {
      // quota / private mode
    }
  }, [
    hydrated,
    ticker,
    budget,
    startPrice,
    rounds,
    dropInterval,
    targetReturn,
    taxRate,
    weightEnabled,
    firstWeightPct,
    forceFirstShare,
    lastCompletedRound,
  ]);

  // Currency toggle: convert raw monetary inputs (budget, startPrice) so the
  // displayed values stay equivalent across currencies. Fires only after the
  // initial localStorage hydration so loaded values aren't double-converted.
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

    setBudget(convert(budget));
    setStartPrice(convert(startPrice));
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

  // Parse raw inputs into canonical USD for calculation.
  const budgetUSD = useMemo(
    () => parseCurrency(budget, currency, rate),
    [budget, currency, rate],
  );
  const startPriceUSD = useMemo(
    () => parseCurrency(startPrice, currency, rate),
    [startPrice, currency, rate],
  );

  const nNum = useMemo(() => {
    const n = Math.floor(parseNum(rounds));
    if (!Number.isFinite(n) || n < N_MIN) return N_DEFAULT;
    return Math.min(n, N_MAX_HARD);
  }, [rounds]);

  // Largest N such that round N still buys at a positive price (ceil formula).
  const maxN = useMemo(() => {
    const dn = parseNum(dropInterval);
    if (dn <= 0) return N_MAX_HARD;
    return Math.min(Math.ceil(100 / dn), N_MAX_HARD);
  }, [dropInterval]);

  useEffect(() => {
    if (nNum > maxN && maxN >= N_MIN) {
      setRounds(String(maxN));
    }
  }, [maxN, nNum]);

  useEffect(() => {
    if (lastCompletedRound > nNum) {
      setLastCompletedRound(nNum);
    } else if (lastCompletedRound < 0) {
      setLastCompletedRound(0);
    }
  }, [nNum, lastCompletedRound]);

  const computed = useMemo(() => {
    const dropNum = parseNum(dropInterval);
    const targetReturnNum = parseNum(targetReturn);
    const taxRateNum = parseNum(taxRate);

    const valid = budgetUSD > 0 && startPriceUSD > 0 && nNum >= N_MIN;
    if (!valid) {
      return {
        valid: false,
        rounds: [] as Round[],
        totalInvest: 0,
        totalShares: 0,
        finalAvg: 0,
        targetSell: 0,
        expectedProfit: 0,
        afterTaxProfit: 0,
        targetReturnPct: targetReturnNum,
        taxRatePct: taxRateNum,
      };
    }

    const effectiveP = weightEnabled
      ? clamp(parseNum(firstWeightPct), WEIGHT_MIN, WEIGHT_MAX)
      : 100 / (Math.pow(2, nNum) - 1);
    const r = solveR(effectiveP, nNum);
    const weights = Array.from({ length: nNum }, (_, k) => Math.pow(r, k));
    const weightSum = weights.reduce((s, w) => s + w, 0);
    const normalizedWeights = weights.map((w) => w / weightSum);

    const returnRatio = targetReturnNum / 100;

    type Pre = { price: number; shares: number };
    const pre: Pre[] = [];
    let inLeadingZeros = forceFirstShare;
    for (let n = 0; n < nNum; n++) {
      const price = startPriceUSD * (1 - (dropNum / 100) * n);
      const allocation = budgetUSD * normalizedWeights[n];
      let shares = price > 0 ? Math.floor(allocation / price) : 0;
      if (inLeadingZeros) {
        if (shares === 0 && price > 0) {
          shares = 1;
        } else if (shares >= 1) {
          inLeadingZeros = false;
        }
      }
      pre.push({ price, shares });
    }

    if (forceFirstShare) {
      let totalCost = pre.reduce((s, p) => s + p.shares * p.price, 0);
      let safety = nNum * 100;
      while (totalCost > budgetUSD && safety-- > 0) {
        let trimmedAny = false;
        for (let i = pre.length - 1; i >= 0; i--) {
          if (pre[i].shares > 0) {
            pre[i].shares -= 1;
            totalCost -= pre[i].price;
            trimmedAny = true;
            break;
          }
        }
        if (!trimmedAny) break;
      }
    }

    const roundsArr: Round[] = [];
    let cumulativeShares = 0;
    let cumulativeBuyAmount = 0;
    for (let n = 0; n < nNum; n++) {
      const { price, shares } = pre[n];
      const buyAmount = shares * price;
      cumulativeShares += shares;
      cumulativeBuyAmount += buyAmount;
      const avgPrice =
        cumulativeShares > 0 ? cumulativeBuyAmount / cumulativeShares : 0;
      const targetPrice = avgPrice * (1 + returnRatio);
      const profit = cumulativeBuyAmount * returnRatio;
      roundsArr.push({
        n: n + 1,
        price,
        cumulativeDropPct: dropNum * n,
        avgPrice,
        shares,
        cumulativeShares,
        buyAmount,
        cumulativeBuyAmount,
        profit,
        targetPrice,
      });
    }

    const last = roundsArr[roundsArr.length - 1];
    const totalInvest = last?.cumulativeBuyAmount ?? 0;
    const totalShares = last?.cumulativeShares ?? 0;
    const finalAvg = last?.avgPrice ?? 0;
    const targetSell = finalAvg * (1 + returnRatio);
    const expectedProfit = last?.profit ?? 0;
    const afterTaxProfit = expectedProfit * (1 - taxRateNum / 100);

    return {
      valid: true,
      rounds: roundsArr,
      totalInvest,
      totalShares,
      finalAvg,
      targetSell,
      expectedProfit,
      afterTaxProfit,
      targetReturnPct: targetReturnNum,
      taxRatePct: taxRateNum,
    };
  }, [
    budgetUSD,
    startPriceUSD,
    nNum,
    dropInterval,
    targetReturn,
    taxRate,
    weightEnabled,
    firstWeightPct,
    forceFirstShare,
  ]);

  const equalBenchmark = useMemo(() => 100 / nNum, [nNum]);

  const profitColor =
    computed.expectedProfit === 0
      ? ""
      : computed.expectedProfit > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

  const afterTaxProfitColor =
    computed.afterTaxProfit === 0
      ? ""
      : computed.afterTaxProfit > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

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

  const handleRoundsStep = (newN: number) => {
    if (newN < N_MIN || newN > N_MAX_HARD) return;
    setRounds(String(newN));
  };

  const handleDropStep = (newDrop: number) => {
    if (newDrop < DROP_MIN || newDrop > DROP_MAX) return;
    setDropInterval(String(newDrop));
  };

  const handleTargetStep = (newTarget: number) => {
    setTargetReturn(String(newTarget));
  };

  const handleTaxStep = (newTax: number) => {
    if (newTax < 0) return;
    setTaxRate(String(newTax));
  };

  const handleBudgetStep = (newBudget: number) => {
    if (newBudget < 0) return;
    setBudget(String(newBudget));
  };

  const handleStartPriceStep = (newPrice: number) => {
    if (newPrice < 0) return;
    setStartPrice(String(newPrice));
  };

  // Currency-aware stepper steps for monetary inputs.
  const budgetSteps =
    currency === "usd"
      ? { small: 100, big: 1000 }
      : { small: 100_000, big: 1_000_000 };
  const startPriceSteps =
    currency === "usd"
      ? { small: 1, big: 10 }
      : { small: 1000, big: 10_000 };

  const handleExportCsv = () => {
    if (!computed.valid) return;
    const header =
      "Round,Price,Drop %,Avg Price,Shares,Cum Shares,Buy Amount,Cum Buy Amount,Profit,Target Price";
    const fmtNum = (usdValue: number): string => {
      const display = currency === "usd" ? usdValue : usdValue * rate;
      return display.toFixed(currency === "usd" ? 2 : 0);
    };
    const lines = computed.rounds.map((r) =>
      [
        r.n,
        fmtNum(r.price),
        r.cumulativeDropPct.toFixed(2),
        fmtNum(r.avgPrice),
        r.shares,
        r.cumulativeShares,
        fmtNum(r.buyAmount),
        fmtNum(r.cumulativeBuyAmount),
        fmtNum(r.profit),
        fmtNum(r.targetPrice),
      ].join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dca-down-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle>{t.inputTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label={t.tickerHeader} htmlFor="dca-ticker">
              <Input
                id="dca-ticker"
                placeholder={t.tickerPlaceholder}
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
              />
            </Field>
            <Field label={t.budgetHeader} htmlFor="dca-budget">
              <NumberStepper
                id="dca-budget"
                value={budget}
                onInputChange={setBudget}
                onStep={handleBudgetStep}
                min={0}
                smallStep={budgetSteps.small}
                bigStep={budgetSteps.big}
                inputMode="decimal"
                placeholder={t.budgetPlaceholder}
                aria-label={t.budgetHeader}
              />
            </Field>
            <Field label={t.startPriceHeader} htmlFor="dca-start">
              <NumberStepper
                id="dca-start"
                value={startPrice}
                onInputChange={setStartPrice}
                onStep={handleStartPriceStep}
                min={0}
                smallStep={startPriceSteps.small}
                bigStep={startPriceSteps.big}
                inputMode="decimal"
                placeholder={t.startPricePlaceholder}
                aria-label={t.startPriceHeader}
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={t.nLabel} htmlFor="dca-rounds">
                <NumberStepper
                  id="dca-rounds"
                  value={rounds}
                  onInputChange={setRounds}
                  onStep={handleRoundsStep}
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
              <Field label={t.dropIntervalLabel} htmlFor="dca-drop">
                <NumberStepper
                  id="dca-drop"
                  value={dropInterval}
                  onInputChange={setDropInterval}
                  onStep={handleDropStep}
                  min={DROP_MIN}
                  max={DROP_MAX}
                  smallStep={1}
                  bigStep={5}
                  inputMode="decimal"
                  placeholder={t.dropIntervalPlaceholder}
                  aria-label={t.dropIntervalLabel}
                  maxReachedMessage={t.stepperDropMax}
                  minReachedMessage={t.stepperDropMin}
                />
              </Field>
              <Field label={t.targetReturnLabel} htmlFor="dca-target">
                <NumberStepper
                  id="dca-target"
                  value={targetReturn}
                  onInputChange={setTargetReturn}
                  onStep={handleTargetStep}
                  min={0}
                  smallStep={1}
                  bigStep={5}
                  inputMode="decimal"
                  placeholder={t.targetReturnPlaceholder}
                  aria-label={t.targetReturnLabel}
                />
              </Field>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="dca-weight-toggle"
                  checked={weightEnabled}
                  onCheckedChange={setWeightEnabled}
                  aria-label={t.weightToggle}
                />
                <Label
                  htmlFor="dca-weight-toggle"
                  className="cursor-pointer text-sm"
                >
                  {t.weightToggle}
                </Label>
                <button
                  type="button"
                  className="group relative inline-flex"
                  aria-label={t.weightTooltip}
                >
                  <Info className="size-3.5 cursor-help text-muted-foreground" />
                  <span className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
                    {t.weightTooltip}
                  </span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t.weightHint}</p>
              {weightEnabled && (
                <div>
                  <Label htmlFor="dca-first-weight" className="text-sm">
                    {t.firstWeightLabel}
                  </Label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Input
                      id="dca-first-weight"
                      type="number"
                      step="any"
                      inputMode="decimal"
                      placeholder={t.firstWeightPlaceholder}
                      value={firstWeightPct}
                      onChange={(e) => setFirstWeightPct(e.target.value)}
                      className="tnum max-w-24"
                    />
                    <span className="text-xs text-muted-foreground">
                      ({t.weightEqualBenchmark} = {equalBenchmark.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Switch
                id="dca-force-first-share"
                checked={forceFirstShare}
                onCheckedChange={setForceFirstShare}
                aria-label={t.forceFirstShareLabel}
              />
              <Label
                htmlFor="dca-force-first-share"
                className="cursor-pointer text-sm"
              >
                {t.forceFirstShareLabel}
              </Label>
              <button
                type="button"
                className="group relative inline-flex"
                aria-label={t.forceFirstShareTooltip}
              >
                <Info className="size-3.5 cursor-help text-muted-foreground" />
                <span className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
                  {t.forceFirstShareTooltip}
                </span>
              </button>
            </div>

            <Field label={t.taxRateLabel} htmlFor="dca-tax-rate">
              <NumberStepper
                id="dca-tax-rate"
                value={taxRate}
                onInputChange={setTaxRate}
                onStep={handleTaxStep}
                min={0}
                smallStep={1}
                bigStep={5}
                inputMode="decimal"
                aria-label={t.taxRateLabel}
              />
            </Field>

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
          </CardContent>
        </Card>

        <Card className="self-start lg:sticky lg:top-4">
          <CardHeader>
            <CardTitle>{t.summaryTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {!computed.valid ? (
              <p className="text-sm text-muted-foreground">{t.emptyHint}</p>
            ) : (
              <dl className="space-y-3">
                <SummaryRow
                  label={t.totalInvestLabel}
                  value={fmtCurrency(computed.totalInvest)}
                />
                <SummaryRow
                  label={t.totalSharesLabel}
                  value={
                    locale === "ko"
                      ? `${fmtInt.format(computed.totalShares)} 주`
                      : fmtInt.format(computed.totalShares)
                  }
                />
                <SummaryRow
                  label={t.finalAvgLabel}
                  value={fmtCurrency(computed.finalAvg)}
                />
                <SummaryRow
                  label={t.targetReturnDisplayLabel}
                  value={`${fmt.format(computed.targetReturnPct)}%`}
                />
                <SummaryRow
                  label={t.targetPriceLabel}
                  value={fmtCurrency(computed.targetSell)}
                />
                <SummaryRow
                  label={t.expectedProfitLabel}
                  value={
                    <span className={cn(profitColor)}>
                      {computed.expectedProfit > 0 ? "+" : ""}
                      {fmtCurrency(computed.expectedProfit)}
                    </span>
                  }
                />
                {computed.taxRatePct > 0 && (
                  <SummaryRow
                    label={t.afterTaxProfitLabel}
                    value={
                      <span className={cn(afterTaxProfitColor)}>
                        {computed.afterTaxProfit > 0 ? "+" : ""}
                        {fmtCurrency(computed.afterTaxProfit)}
                      </span>
                    }
                  />
                )}
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      {computed.valid && (
        <DcaDownDetail
          rounds={computed.rounds}
          fmt={fmt}
          fmtInt={fmtInt}
          fmtCurrency={fmtCurrency}
          lastCompletedRound={lastCompletedRound}
          onRoundClick={handleRowClick}
          onReset={() => setLastCompletedRound(0)}
          onExportCsv={handleExportCsv}
          targetReturnPct={computed.targetReturnPct}
          tableTitle={t.tableTitle}
          legendCompleted={t.legendCompleted}
          legendNextBuy={t.legendNextBuy}
          legendReset={t.legendReset}
          exportCsvLabel={t.exportCsvLabel}
          colRound={t.colRound}
          colPrice={t.colPrice}
          colDropPct={t.colDropPct}
          colAvgPrice={t.colAvgPrice}
          colShares={t.colShares}
          colCumShares={t.colCumShares}
          colBuyAmount={t.colBuyAmount}
          colCumBuyAmount={t.colCumBuyAmount}
          colProfit={t.colProfit}
          colTargetPrice={t.colTargetPrice}
        />
      )}
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
