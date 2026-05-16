"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Currency } from "@/lib/format/currency";

const STORAGE_KEY = "brennhub:currency";
const DEFAULT_CURRENCY: Currency = "usd";

function isCurrency(v: unknown): v is Currency {
  return v === "usd" || v === "krw";
}

type CurrencyContextValue = {
  currency: Currency;
  setCurrency: (c: Currency) => void;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(DEFAULT_CURRENCY);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (isCurrency(stored)) {
        setCurrencyState(stored);
      }
    } catch {
      // localStorage unavailable; keep default
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {
      // ignore — selection still applies in-session
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
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
