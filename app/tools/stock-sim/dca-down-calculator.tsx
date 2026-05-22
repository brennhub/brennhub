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
import { DcaDownDetail } from "./dca-down-detail";
import { DcaDownSellDetail } from "./dca-down-sell-detail";

const STORAGE_KEY = "brennhub:stock-sim:dca-down";

const N_MIN = 2;
const N_MAX_HARD = 50;
const N_DEFAULT = 5;
const TARGET_RETURN_DEFAULT = "10";
const DROP_INTERVAL_DEFAULT = "5";
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 100;
const DROP_MIN = 0;
const DROP_MAX = 50;
const TAX_MAX = 50;
const TARGET_MAX = 500;
const RISE_INTERVAL_DEFAULT = "5";
const RISE_MIN = 0;
const RISE_MAX = 100;
const SELL_N_MIN = N_MIN;
const SELL_N_MAX = N_MAX_HARD;

type TaxType = "short" | "long" | "custom";

function isTaxType(v: unknown): v is TaxType {
  return v === "short" || v === "long" || v === "custom";
}

type StoredState = {
  ticker: string;
  budget: string;
  startPrice: string;
  rounds: string;
  dropInterval: string;
  targetReturn: string;
  taxRate: string;
  taxType: TaxType;
  weightEnabled: boolean;
  firstWeightPct: string;
  lastCompletedRound: number;
  forceFirstShare: boolean;
  sellEnabled: boolean;
  sellRounds: string;
  riseInterval: string;
  lastCompletedSellRound: number;
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

type SellRound = {
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

// Shared weighting: Martingale ratio (2x default) or symmetric 0-100 tilt.
// Used by both the buy plan and the split-sell ladder.
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

// Largest-remainder integer allocation: splits an integer total across
// fractional weights so the parts sum back to exactly `total`. The buy side
// distributes cash (floor + trim); the sell side distributes shares and needs
// an exact integer partition instead.
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

export function DcaDownCalculator() {
  const t = useMessages().stockSim.dcaDown;
  const { locale } = useLocale();
  const { currency, rate } = useCurrency();

  const [ticker, setTicker] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [startPrice, setStartPrice] = useState<string>("");
  const [rounds, setRounds] = useState<string>(String(N_DEFAULT));
  const [dropInterval, setDropInterval] = useState<string>(
    DROP_INTERVAL_DEFAULT,
  );
  const [targetReturn, setTargetReturn] = useState<string>(
    TARGET_RETURN_DEFAULT,
  );
  const [taxRate, setTaxRate] = useState<string>("0");
  const [taxType, setTaxType] = useState<TaxType>("custom");
  const [weightEnabled, setWeightEnabled] = useState<boolean>(false);
  const [firstWeightPct, setFirstWeightPct] = useState<string>("50");
  const [forceFirstShare, setForceFirstShare] = useState<boolean>(true);
  const [lastCompletedRound, setLastCompletedRound] = useState<number>(0);
  const [sellEnabled, setSellEnabled] = useState<boolean>(false);
  const [sellRounds, setSellRounds] = useState<string>(String(N_DEFAULT));
  const [riseInterval, setRiseInterval] = useState<string>(
    RISE_INTERVAL_DEFAULT,
  );
  const [lastCompletedSellRound, setLastCompletedSellRound] =
    useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

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
        if (isTaxType(parsed.taxType)) setTaxType(parsed.taxType);
        if (typeof parsed.weightEnabled === "boolean")
          setWeightEnabled(parsed.weightEnabled);
        // firstWeightPct: old values used asymmetric R1-share meaning;
        // new mapping is symmetric tilt (0-100). Skip load to force default 50.
        if (typeof parsed.forceFirstShare === "boolean")
          setForceFirstShare(parsed.forceFirstShare);
        if (typeof parsed.lastCompletedRound === "number") {
          setLastCompletedRound(parsed.lastCompletedRound);
        } else if (typeof parsed.nextBuyRound === "number") {
          setLastCompletedRound(Math.max(0, parsed.nextBuyRound - 1));
        }
        if (typeof parsed.sellEnabled === "boolean")
          setSellEnabled(parsed.sellEnabled);
        if (typeof parsed.sellRounds === "string")
          setSellRounds(parsed.sellRounds);
        if (typeof parsed.riseInterval === "string")
          setRiseInterval(parsed.riseInterval);
        if (typeof parsed.lastCompletedSellRound === "number")
          setLastCompletedSellRound(parsed.lastCompletedSellRound);
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
          budget,
          startPrice,
          rounds,
          dropInterval,
          targetReturn,
          taxRate,
          taxType,
          weightEnabled,
          firstWeightPct,
          forceFirstShare,
          lastCompletedRound,
          sellEnabled,
          sellRounds,
          riseInterval,
          lastCompletedSellRound,
        } satisfies StoredState),
      );
    } catch {
      // quota
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
    taxType,
    weightEnabled,
    firstWeightPct,
    forceFirstShare,
    lastCompletedRound,
    sellEnabled,
    sellRounds,
    riseInterval,
    lastCompletedSellRound,
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

  const budgetUSD = useMemo(
    () => parseCurrency(budget, currency, rate),
    [budget, currency, rate],
  );
  const startPriceUSD = useMemo(
    () => parseCurrency(startPrice, currency, rate),
    [startPrice, currency, rate],
  );

  const formatBudgetDisplay = (raw: string): string => {
    if (!raw) return "";
    const usd = parseCurrency(raw, currency, rate);
    if (usd === 0) return raw;
    return fmtCurrency(usd);
  };
  const formatStartPriceDisplay = (raw: string): string => {
    if (!raw) return "";
    const usd = parseCurrency(raw, currency, rate);
    if (usd === 0) return raw;
    return fmtCurrency(usd);
  };
  const formatNWithUnit = (raw: string): string =>
    raw ? `${raw} ${t.unitN}` : "";
  const formatPercent = (raw: string): string => (raw ? `${raw} %` : "");

  const nNum = useMemo(() => {
    const n = Math.floor(parseNum(rounds));
    if (!Number.isFinite(n) || n < N_MIN) return N_DEFAULT;
    return Math.min(n, N_MAX_HARD);
  }, [rounds]);

  const maxN = useMemo(() => {
    const dn = parseNum(dropInterval);
    if (dn <= 0) return N_MAX_HARD;
    return Math.min(Math.ceil(100 / dn), N_MAX_HARD);
  }, [dropInterval]);

  const sellNNum = useMemo(() => {
    const n = Math.floor(parseNum(sellRounds));
    if (!Number.isFinite(n) || n < SELL_N_MIN) return N_DEFAULT;
    return Math.min(n, SELL_N_MAX);
  }, [sellRounds]);

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

  useEffect(() => {
    if (lastCompletedSellRound > sellNNum) {
      setLastCompletedSellRound(sellNNum);
    } else if (lastCompletedSellRound < 0) {
      setLastCompletedSellRound(0);
    }
  }, [sellNNum, lastCompletedSellRound]);

  const computed = useMemo(() => {
    const dropNum = parseNum(dropInterval);
    const targetReturnNum = parseNum(targetReturn);
    const taxRateNum = parseNum(taxRate);

    const valid =
      budgetUSD > 0 &&
      startPriceUSD > 0 &&
      nNum >= N_MIN &&
      dropNum > 0;
    if (!valid) {
      return {
        valid: false,
        rounds: [] as Round[],
        totalInvest: 0,
        totalShares: 0,
        finalAvg: 0,
        targetSell: 0,
        expectedProfit: 0,
        taxAmount: 0,
        afterTaxProfit: 0,
        targetReturnPct: targetReturnNum,
        taxRatePct: taxRateNum,
      };
    }

    const normalizedWeights = computeNormalizedWeights(
      nNum,
      weightEnabled,
      firstWeightPct,
    );

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
    const taxAmount = expectedProfit * (taxRateNum / 100);
    const afterTaxProfit = expectedProfit - taxAmount;

    return {
      valid: true,
      rounds: roundsArr,
      totalInvest,
      totalShares,
      finalAvg,
      targetSell,
      expectedProfit,
      taxAmount,
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

  // Split-sell ladder: distributes the accumulated position (computed.totalShares)
  // across sell rounds rising from the average cost. Sell round m price =
  // finalAvg × (1 + rise% × m), so round 1 already sits +rise% in profit.
  const sellComputed = useMemo(() => {
    const riseNum = parseNum(riseInterval);
    const taxRateNum = parseNum(taxRate);
    const totalShares = computed.totalShares;
    const finalAvg = computed.finalAvg;

    const valid =
      computed.valid &&
      totalShares > 0 &&
      finalAvg > 0 &&
      sellNNum >= SELL_N_MIN &&
      riseNum > 0;
    if (!valid) {
      return {
        valid: false,
        rounds: [] as SellRound[],
        avgSellPrice: 0,
        realizedProfit: 0,
        taxAmount: 0,
        afterTaxProfit: 0,
      };
    }

    const weights = computeNormalizedWeights(
      sellNNum,
      weightEnabled,
      firstWeightPct,
    );
    const shareAlloc = allocateShares(totalShares, weights);

    const roundsArr: SellRound[] = [];
    let cumulativeShares = 0;
    let cumulativeSellAmount = 0;
    for (let m = 0; m < sellNNum; m++) {
      const risePct = riseNum * (m + 1);
      const price = finalAvg * (1 + risePct / 100);
      const shares = shareAlloc[m];
      const sellAmount = shares * price;
      const realizedPnl = shares * (price - finalAvg);
      cumulativeShares += shares;
      cumulativeSellAmount += sellAmount;
      roundsArr.push({
        n: m + 1,
        price,
        cumulativeRisePct: risePct,
        shares,
        cumulativeShares,
        sellAmount,
        cumulativeSellAmount,
        realizedPnl,
      });
    }

    const avgSellPrice =
      totalShares > 0 ? cumulativeSellAmount / totalShares : 0;
    const realizedProfit = cumulativeSellAmount - totalShares * finalAvg;
    const taxAmount = realizedProfit * (taxRateNum / 100);
    const afterTaxProfit = realizedProfit - taxAmount;

    return {
      valid: true,
      rounds: roundsArr,
      avgSellPrice,
      realizedProfit,
      taxAmount,
      afterTaxProfit,
    };
  }, [
    computed,
    riseInterval,
    sellNNum,
    taxRate,
    weightEnabled,
    firstWeightPct,
  ]);

  // Summary card swaps between buy-target and split-sell figures.
  const displayProfit = sellEnabled
    ? sellComputed.realizedProfit
    : computed.expectedProfit;
  const displayTax = sellEnabled ? sellComputed.taxAmount : computed.taxAmount;
  const displayAfterTax = sellEnabled
    ? sellComputed.afterTaxProfit
    : computed.afterTaxProfit;
  const summaryValid = sellEnabled ? sellComputed.valid : computed.valid;

  const profitColor =
    displayProfit === 0
      ? ""
      : displayProfit > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

  const afterTaxColor =
    displayAfterTax === 0
      ? ""
      : displayAfterTax > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";

  const taxColor = displayTax > 0 ? "text-[var(--color-loss)]" : "";

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

  const sellZeroShareWarning = useMemo(() => {
    if (!sellComputed.valid) return null;
    const zeros = sellComputed.rounds
      .filter((r) => r.shares === 0)
      .map((r) => r.n);
    if (zeros.length === 0) return null;
    return {
      start: zeros[0],
      end: zeros[zeros.length - 1],
      count: zeros.length,
    };
  }, [sellComputed]);

  const handleRowClick = (n: number) => {
    setLastCompletedRound(n);
  };

  const handleSellRowClick = (n: number) => {
    setLastCompletedSellRound(n);
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
    if (newN < N_MIN || newN > maxN) return;
    setRounds(String(newN));
  };

  const handleDropStep = (newDrop: number) => {
    if (newDrop < DROP_MIN || newDrop > DROP_MAX) return;
    setDropInterval(String(newDrop));
  };

  const handleSellRoundsChange = (text: string) => {
    setSellRounds(text.replace(/[^\d]/g, ""));
  };

  const handleSellRoundsBlur = () => {
    const n = parseInt(sellRounds, 10);
    if (!sellRounds || !Number.isFinite(n) || n < SELL_N_MIN) {
      setSellRounds(String(SELL_N_MIN));
    }
  };

  const handleSellRoundsStep = (newN: number) => {
    if (newN < SELL_N_MIN || newN > SELL_N_MAX) return;
    setSellRounds(String(newN));
  };

  const handleRiseStep = (newRise: number) => {
    if (newRise < RISE_MIN || newRise > RISE_MAX) return;
    setRiseInterval(String(newRise));
  };

  const handleTargetStep = (newTarget: number) => {
    if (newTarget < 0 || newTarget > TARGET_MAX) return;
    setTargetReturn(String(newTarget));
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

  const handleBudgetStep = (newBudget: number) => {
    if (newBudget < 0) return;
    setBudget(String(newBudget));
  };

  const handleStartPriceStep = (newPrice: number) => {
    if (newPrice < 0) return;
    setStartPrice(String(newPrice));
  };

  // Reset every plan-card input back to defaults. lastCompletedRound (detail
  // card) and global toggles (color/currency) intentionally stay untouched.
  const resetPlan = () => {
    setTicker("");
    setBudget("");
    setStartPrice("");
    setRounds(String(N_DEFAULT));
    setDropInterval(DROP_INTERVAL_DEFAULT);
    setTargetReturn(TARGET_RETURN_DEFAULT);
    setTaxRate("0");
    setTaxType("custom");
    setWeightEnabled(false);
    setFirstWeightPct("50");
    setForceFirstShare(true);
    setSellEnabled(false);
    setSellRounds(String(N_DEFAULT));
    setRiseInterval(RISE_INTERVAL_DEFAULT);
  };

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
    const showTarget = !sellEnabled;
    const header = [
      t.colRound,
      t.colPrice,
      t.colDropPct,
      t.colAvgPrice,
      t.colShares,
      t.colCumShares,
      t.colBuyAmount,
      t.colCumBuyAmount,
      ...(showTarget ? [t.colProfit, t.colTargetPrice] : []),
    ].join(",");
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
        ...(showTarget ? [fmtNum(r.profit), fmtNum(r.targetPrice)] : []),
      ].join(","),
    );
    const csv = "﻿" + [header, ...lines].join("\n");
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

  const handleExportSellCsv = () => {
    if (!sellComputed.valid) return;
    const header = [
      t.colSellRound,
      t.colSellPrice,
      t.colRisePct,
      t.colSellShares,
      t.colCumSoldShares,
      t.colSellAmount,
      t.colCumSellAmount,
      t.colRealizedPnl,
    ].join(",");
    const fmtNum = (usdValue: number): string => {
      const display = currency === "usd" ? usdValue : usdValue * rate;
      return display.toFixed(currency === "usd" ? 2 : 0);
    };
    const lines = sellComputed.rounds.map((r) =>
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
    a.download = `dca-down-sell-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const nMaxMessage = t.stepperNMax.replace("{max}", String(maxN));

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
            displayFormatter={formatBudgetDisplay}
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
            displayFormatter={formatStartPriceDisplay}
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
              onInputChange={handleRoundsChange}
              onInputBlur={handleRoundsBlur}
              onStep={handleRoundsStep}
              displayFormatter={formatNWithUnit}
              min={N_MIN}
              max={maxN}
              smallStep={1}
              bigStep={10}
              inputMode="numeric"
              placeholder={t.nPlaceholder}
              aria-label={t.nLabel}
              maxReachedMessage={nMaxMessage}
              minReachedMessage={t.stepperNMin}
            />
          </Field>
          <Field label={t.dropIntervalLabel} htmlFor="dca-drop">
            <NumberStepper
              id="dca-drop"
              value={dropInterval}
              onInputChange={setDropInterval}
              onStep={handleDropStep}
              displayFormatter={formatPercent}
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
          <Field
            label={t.targetReturnLabel}
            htmlFor="dca-target"
            disabled={sellEnabled}
          >
            <NumberStepper
              id="dca-target"
              value={targetReturn}
              onInputChange={setTargetReturn}
              onStep={handleTargetStep}
              displayFormatter={formatPercent}
              min={0}
              max={TARGET_MAX}
              smallStep={1}
              bigStep={5}
              inputMode="decimal"
              placeholder={t.targetReturnPlaceholder}
              aria-label={t.targetReturnLabel}
              maxReachedMessage={t.stepperTargetMax}
              disabled={sellEnabled}
            />
          </Field>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="dca-tax-rate" className="text-sm">
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
            id="dca-tax-rate"
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
            <InfoTooltip text={t.weightTooltip} />
          </div>
          <p className="text-xs text-muted-foreground">{t.weightHint}</p>
          {weightEnabled && (
            <div>
              <Label htmlFor="dca-first-weight" className="text-sm">
                {t.firstWeightLabel}
              </Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <NumberStepper
                  id="dca-first-weight"
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
          <InfoTooltip text={t.forceFirstShareTooltip} />
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Switch
              id="dca-sell-toggle"
              checked={sellEnabled}
              onCheckedChange={setSellEnabled}
              aria-label={t.sellToggleLabel}
            />
            <Label
              htmlFor="dca-sell-toggle"
              className="cursor-pointer text-sm"
            >
              {t.sellToggleLabel}
            </Label>
            <InfoTooltip text={t.sellToggleTooltip} />
          </div>
          {sellEnabled && (
            <>
              <p className="text-xs text-muted-foreground">
                {t.sellSectionHint}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t.sellRoundsLabel} htmlFor="dca-sell-rounds">
                  <NumberStepper
                    id="dca-sell-rounds"
                    value={sellRounds}
                    onInputChange={handleSellRoundsChange}
                    onInputBlur={handleSellRoundsBlur}
                    onStep={handleSellRoundsStep}
                    displayFormatter={formatNWithUnit}
                    min={SELL_N_MIN}
                    max={SELL_N_MAX}
                    smallStep={1}
                    bigStep={10}
                    inputMode="numeric"
                    placeholder={t.sellRoundsPlaceholder}
                    aria-label={t.sellRoundsLabel}
                    maxReachedMessage={t.stepperSellRoundsMax}
                    minReachedMessage={t.stepperSellRoundsMin}
                  />
                </Field>
                <Field label={t.riseIntervalLabel} htmlFor="dca-rise">
                  <NumberStepper
                    id="dca-rise"
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
                  />
                </Field>
              </div>
              {sellZeroShareWarning && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️{" "}
                  {sellZeroShareWarning.count === 1
                    ? t.sellZeroShareWarningSingle.replace(
                        "{n}",
                        String(sellZeroShareWarning.start),
                      )
                    : t.sellZeroShareWarningRange
                        .replace(
                          "{start}",
                          String(sellZeroShareWarning.start),
                        )
                        .replace("{end}", String(sellZeroShareWarning.end))}
                </p>
              )}
            </>
          )}
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
            label={t.totalInvestLabel}
            value={computed.valid ? fmtCurrency(computed.totalInvest) : "—"}
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
            label={t.finalAvgLabel}
            value={computed.valid ? fmtCurrency(computed.finalAvg) : "—"}
          />
          {!sellEnabled && (
            <SummaryRow
              label={t.targetReturnDisplayLabel}
              value={
                computed.valid
                  ? `${fmt.format(computed.targetReturnPct)}%`
                  : "—"
              }
            />
          )}
          {sellEnabled ? (
            <SummaryRow
              label={t.avgSellPriceLabel}
              value={
                sellComputed.valid
                  ? fmtCurrency(sellComputed.avgSellPrice)
                  : "—"
              }
            />
          ) : (
            <SummaryRow
              label={t.targetPriceLabel}
              value={computed.valid ? fmtCurrency(computed.targetSell) : "—"}
            />
          )}
          <SummaryRow
            label={sellEnabled ? t.realizedProfitLabel : t.expectedProfitLabel}
            value={
              summaryValid ? (
                <span className={cn(profitColor)}>
                  {displayProfit > 0 ? "+" : ""}
                  {fmtCurrency(displayProfit)}
                </span>
              ) : (
                "—"
              )
            }
          />
          <SummaryRow
            label={t.taxAmountLabel}
            value={
              summaryValid ? (
                <span className={cn(taxColor)}>
                  {displayTax > 0 ? "−" : ""}
                  {fmtCurrency(displayTax)}
                </span>
              ) : (
                "—"
              )
            }
          />
          <SummaryRow
            label={
              sellEnabled ? t.afterTaxRealizedLabel : t.afterTaxProfitLabel
            }
            value={
              summaryValid ? (
                <span className={cn(afterTaxColor)}>
                  {displayAfterTax > 0 ? "+" : ""}
                  {fmtCurrency(displayAfterTax)}
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
        showTargetColumns={!sellEnabled}
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
        emptyHint={t.tableEmptyHint}
      />

      {sellEnabled && (
        <DcaDownSellDetail
          rounds={sellComputed.rounds}
          fmt={fmt}
          fmtInt={fmtInt}
          fmtCurrency={fmtCurrency}
          lastCompletedSellRound={lastCompletedSellRound}
          onSellRoundClick={handleSellRowClick}
          onReset={() => setLastCompletedSellRound(0)}
          onExportCsv={handleExportSellCsv}
          tableTitle={t.sellTableTitle}
          legendCompleted={t.legendSellCompleted}
          legendNextSell={t.legendSellNext}
          legendReset={t.legendReset}
          exportCsvLabel={t.exportCsvLabel}
          colRound={t.colSellRound}
          colPrice={t.colSellPrice}
          colRisePct={t.colRisePct}
          colShares={t.colSellShares}
          colCumShares={t.colCumSoldShares}
          colSellAmount={t.colSellAmount}
          colCumSellAmount={t.colCumSellAmount}
          colRealizedPnl={t.colRealizedPnl}
          emptyHint={t.sellEmptyHint}
        />
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  disabled,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", disabled && "opacity-60")}>
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
