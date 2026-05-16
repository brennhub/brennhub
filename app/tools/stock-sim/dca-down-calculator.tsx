"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { DcaDownDetail } from "./dca-down-detail";

const STORAGE_KEY = "brennhub:stock-sim:dca-down";

const N_MIN = 2;
const N_MAX = 50;
const N_DEFAULT = 10;
const WEIGHT_MIN = 0.01;
const WEIGHT_MAX = 95;

type StoredState = {
  ticker: string;
  budget: string;
  startPrice: string;
  rounds: string;
  dropInterval: string;
  targetReturn: string;
  weightEnabled: boolean;
  firstWeightPct: string;
  nextBuyRound: number;
};

type Round = {
  n: number;
  price: number;
  cumulativeDropPct: number;
  buyAmount: number;
  shares: number;
  cumulativeShares: number;
  cumulativeCost: number;
  avgPrice: number;
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
// weights[k] = r^k. Sum = (1 - r^N) / (1 - r) for r ≠ 1, else N.
// First weight ratio: weights[0] / sum = 1 / sum = P / 100.
// So target sum = 100 / P. Sum is monotonically increasing in r > 0.
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

  const [ticker, setTicker] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [startPrice, setStartPrice] = useState<string>("");
  const [rounds, setRounds] = useState<string>(String(N_DEFAULT));
  const [dropInterval, setDropInterval] = useState<string>("5");
  const [targetReturn, setTargetReturn] = useState<string>("30");
  const [weightEnabled, setWeightEnabled] = useState<boolean>(false);
  const [firstWeightPct, setFirstWeightPct] = useState<string>("10");
  const [nextBuyRound, setNextBuyRound] = useState<number>(1);
  const [hydrated, setHydrated] = useState(false);

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
        if (typeof parsed.dropInterval === "string")
          setDropInterval(parsed.dropInterval);
        if (typeof parsed.targetReturn === "string")
          setTargetReturn(parsed.targetReturn);
        if (typeof parsed.weightEnabled === "boolean")
          setWeightEnabled(parsed.weightEnabled);
        if (typeof parsed.firstWeightPct === "string")
          setFirstWeightPct(parsed.firstWeightPct);
        if (typeof parsed.nextBuyRound === "number")
          setNextBuyRound(parsed.nextBuyRound);
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
          weightEnabled,
          firstWeightPct,
          nextBuyRound,
        } satisfies StoredState),
      );
    } catch {
      // quota / private mode — in-session only
    }
  }, [
    hydrated,
    ticker,
    budget,
    startPrice,
    rounds,
    dropInterval,
    targetReturn,
    weightEnabled,
    firstWeightPct,
    nextBuyRound,
  ]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const formatNum = (n: number): string => fmt.format(n);

  const nNum = useMemo(() => {
    const n = Math.floor(parseNum(rounds));
    if (!Number.isFinite(n) || n < N_MIN) return N_DEFAULT;
    return Math.min(n, N_MAX);
  }, [rounds]);

  // Auto-clamp nextBuyRound to current N range. Fires after N decreases.
  useEffect(() => {
    if (nextBuyRound > nNum) {
      setNextBuyRound(nNum);
    } else if (nextBuyRound < 1) {
      setNextBuyRound(1);
    }
  }, [nNum, nextBuyRound]);

  const computed = useMemo(() => {
    const budgetNum = parseNum(budget);
    const startPriceNum = parseNum(startPrice);
    const dropNum = parseNum(dropInterval);
    const targetReturnNum = parseNum(targetReturn);

    // Budget is only required when weighting is on. Default rule buys 1 share
    // per round and doesn't depend on Budget.
    const valid =
      startPriceNum > 0 &&
      nNum >= N_MIN &&
      (!weightEnabled || budgetNum > 0);
    if (!valid) {
      return {
        valid: false,
        rounds: [] as Round[],
        totalInvest: 0,
        totalShares: 0,
        finalAvg: 0,
        targetSell: 0,
        expectedProfit: 0,
      };
    }

    let normalizedWeights: number[] | null = null;
    if (weightEnabled) {
      const p = clamp(parseNum(firstWeightPct), WEIGHT_MIN, WEIGHT_MAX);
      const r = solveR(p, nNum);
      const weights = Array.from({ length: nNum }, (_, k) => Math.pow(r, k));
      const weightSum = weights.reduce((s, w) => s + w, 0);
      normalizedWeights = weights.map((w) => w / weightSum);
    }

    const roundsArr: Round[] = [];
    let cumulativeShares = 0;
    let cumulativeCost = 0;
    for (let n = 0; n < nNum; n++) {
      const price = startPriceNum * (1 - (dropNum / 100) * n);
      let buyAmount: number;
      let shares: number;
      let actualCost: number;

      if (weightEnabled && normalizedWeights) {
        buyAmount = budgetNum * normalizedWeights[n];
        shares = price > 0 ? Math.floor(buyAmount / price) : 0;
        actualCost = shares * price;
      } else if (price > 0) {
        shares = 1;
        actualCost = price;
        buyAmount = price;
      } else {
        shares = 0;
        actualCost = 0;
        buyAmount = 0;
      }

      cumulativeShares += shares;
      cumulativeCost += actualCost;
      const avgPrice =
        cumulativeShares > 0 ? cumulativeCost / cumulativeShares : 0;
      const targetPrice = avgPrice * (1 + targetReturnNum / 100);
      roundsArr.push({
        n: n + 1,
        price,
        cumulativeDropPct: dropNum * n,
        buyAmount,
        shares,
        cumulativeShares,
        cumulativeCost,
        avgPrice,
        targetPrice,
      });
    }

    const last = roundsArr[roundsArr.length - 1];
    const totalInvest = last?.cumulativeCost ?? 0;
    const totalShares = last?.cumulativeShares ?? 0;
    const finalAvg = last?.avgPrice ?? 0;
    const targetSell = finalAvg * (1 + targetReturnNum / 100);
    const expectedProfit =
      totalShares > 0 ? (targetSell - finalAvg) * totalShares : 0;

    return {
      valid: true,
      rounds: roundsArr,
      totalInvest,
      totalShares,
      finalAvg,
      targetSell,
      expectedProfit,
    };
  }, [
    budget,
    startPrice,
    nNum,
    dropInterval,
    targetReturn,
    weightEnabled,
    firstWeightPct,
  ]);

  const equalBenchmark = useMemo(() => 100 / nNum, [nNum]);

  const profitColor =
    computed.expectedProfit === 0
      ? ""
      : computed.expectedProfit > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

  const handleNextBuyRoundChange = (raw: string) => {
    const v = parseInt(raw, 10);
    if (!Number.isFinite(v)) return;
    setNextBuyRound(clamp(v, 1, nNum));
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
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
              <Input
                id="dca-budget"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={t.budgetPlaceholder}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="tnum"
              />
            </Field>
            <Field label={t.startPriceHeader} htmlFor="dca-start">
              <Input
                id="dca-start"
                type="number"
                step="any"
                inputMode="decimal"
                placeholder={t.startPricePlaceholder}
                value={startPrice}
                onChange={(e) => setStartPrice(e.target.value)}
                className="tnum"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={t.nLabel} htmlFor="dca-rounds">
                <Input
                  id="dca-rounds"
                  type="number"
                  min={N_MIN}
                  max={N_MAX}
                  step={1}
                  inputMode="numeric"
                  placeholder={t.nPlaceholder}
                  value={rounds}
                  onChange={(e) => setRounds(e.target.value)}
                  className="tnum"
                />
              </Field>
              <Field label={t.dropIntervalLabel} htmlFor="dca-drop">
                <Input
                  id="dca-drop"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.dropIntervalPlaceholder}
                  value={dropInterval}
                  onChange={(e) => setDropInterval(e.target.value)}
                  className="tnum"
                />
              </Field>
              <Field label={t.targetReturnLabel} htmlFor="dca-target">
                <Input
                  id="dca-target"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.targetReturnPlaceholder}
                  value={targetReturn}
                  onChange={(e) => setTargetReturn(e.target.value)}
                  className="tnum"
                />
              </Field>
            </div>

            <Field label={t.nextBuyRoundLabel} htmlFor="dca-next-buy">
              <Input
                id="dca-next-buy"
                type="number"
                min={1}
                max={nNum}
                step={1}
                inputMode="numeric"
                value={nextBuyRound}
                onChange={(e) => handleNextBuyRoundChange(e.target.value)}
                className="tnum max-w-24"
              />
            </Field>

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
                  <span className="pointer-events-none invisible absolute left-1/2 top-full z-10 mt-2 w-72 max-w-[80vw] -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus:visible group-focus:opacity-100">
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
                  value={formatNum(computed.totalInvest)}
                />
                <SummaryRow
                  label={t.totalSharesLabel}
                  value={formatNum(computed.totalShares)}
                />
                <SummaryRow
                  label={t.finalAvgLabel}
                  value={formatNum(computed.finalAvg)}
                />
                <SummaryRow
                  label={t.targetPriceLabel}
                  value={formatNum(computed.targetSell)}
                />
                <SummaryRow
                  label={t.expectedProfitLabel}
                  value={
                    <span className={cn(profitColor)}>
                      {computed.expectedProfit > 0 ? "+" : ""}
                      {formatNum(computed.expectedProfit)}
                    </span>
                  }
                />
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      {computed.valid && (
        <DcaDownDetail
          rounds={computed.rounds}
          fmt={fmt}
          nextBuyRound={nextBuyRound}
          onRoundClick={setNextBuyRound}
          tableTitle={t.tableTitle}
          colRound={t.colRound}
          colPrice={t.colPrice}
          colDropPct={t.colDropPct}
          colBuyAmount={t.colBuyAmount}
          colShares={t.colShares}
          colCumShares={t.colCumShares}
          colCumCost={t.colCumCost}
          colAvgPrice={t.colAvgPrice}
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
