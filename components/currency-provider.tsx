"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Currency } from "@/lib/format/currency";

const STORAGE_CURRENCY = "brennhub:currency";
const STORAGE_RATE = "brennhub:exchange-rate";
const STORAGE_MANUAL_RATE = "brennhub:manual-rate";
const DEFAULT_CURRENCY: Currency = "usd";
const FALLBACK_RATE = 1387;
const TTL_MS = 60 * 60 * 1000; // 1 hour
const API_URL = "https://api.frankfurter.app/latest?from=USD&to=KRW";

type RateCache = {
  rate: number;
  date: string;
  fetchedAt: number;
};

function isCurrency(v: unknown): v is Currency {
  return v === "usd" || v === "krw";
}

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rate: number; // effective: manual ?? api
  apiRate: number;
  manualRateInput: string; // raw text so decimal typing isn't lost
  setManualRateInput: (s: string) => void;
  manualRate: number | null; // derived numeric
  isManualRate: boolean;
  rateDate: string | null;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);
  const [apiRate, setApiRate] = useState<number>(FALLBACK_RATE);
  const [manualRateInput, setManualRateInputState] = useState<string>("");
  const [rateDate, setRateDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_CURRENCY);
      if (isCurrency(stored)) setCurrencyState(stored);
    } catch {
      // unavailable
    }
    try {
      const storedManual = localStorage.getItem(STORAGE_MANUAL_RATE);
      if (storedManual !== null) {
        setManualRateInputState(storedManual);
      }
    } catch {
      // unavailable
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRate() {
      let usingCache = false;
      try {
        const cached = localStorage.getItem(STORAGE_RATE);
        if (cached) {
          const parsed = JSON.parse(cached) as Partial<RateCache>;
          if (
            typeof parsed.rate === "number" &&
            parsed.rate > 0 &&
            typeof parsed.fetchedAt === "number" &&
            Date.now() - parsed.fetchedAt < TTL_MS
          ) {
            if (!cancelled) {
              setApiRate(parsed.rate);
              setRateDate(parsed.date ?? null);
            }
            usingCache = true;
          }
        }
      } catch {
        // ignore
      }

      if (usingCache) return;

      try {
        const res = await fetch(API_URL);
        if (!res.ok) return;
        const json = (await res.json()) as {
          rates?: { KRW?: number };
          date?: string;
        };
        const newRate = json.rates?.KRW;
        if (typeof newRate !== "number" || newRate <= 0) return;
        const date = json.date ?? null;
        if (!cancelled) {
          setApiRate(newRate);
          setRateDate(date);
        }
        try {
          localStorage.setItem(
            STORAGE_RATE,
            JSON.stringify({
              rate: newRate,
              date: date ?? "",
              fetchedAt: Date.now(),
            } satisfies RateCache),
          );
        } catch {
          // quota
        }
      } catch {
        // network — keep FALLBACK_RATE
      }
    }

    loadRate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_CURRENCY, c);
    } catch {
      // ignore
    }
  };

  const setManualRateInput = (s: string) => {
    setManualRateInputState(s);
    try {
      if (s === "") {
        localStorage.removeItem(STORAGE_MANUAL_RATE);
      } else {
        localStorage.setItem(STORAGE_MANUAL_RATE, s);
      }
    } catch {
      // ignore
    }
  };

  const manualRate = useMemo<number | null>(() => {
    if (!manualRateInput) return null;
    const n = parseFloat(manualRateInput);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [manualRateInput]);

  const isManualRate = manualRate !== null;
  const rate = isManualRate ? (manualRate as number) : apiRate;

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rate,
        apiRate,
        manualRateInput,
        setManualRateInput,
        manualRate,
        isManualRate,
        rateDate,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return ctx;
}
