"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { useCurrency } from "@/components/currency-provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import { getCalcStorage } from "@/lib/stock-sim/storage";
import {
  formatCurrency,
  parseCurrency,
  type Currency,
} from "@/lib/format/currency";
import { cn } from "@/lib/utils";

type Row = { id: string; price: string; qty: string };

type StoredState = {
  rows: Row[];
  currentPrice: string;
};

/** localStorage parse (게스트 legacy). cost-basis는 schemaVersion 없음 — 방어적 형태 확인만. */
function parseStored(raw: unknown): StoredState | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as StoredState;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function emptyRow(): Row {
  return { id: newId(), price: "", qty: "" };
}

function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function CostBasisCalculator() {
  const t = useMessages().stockSim.costBasis;
  const { locale } = useLocale();
  const { currency, rate } = useCurrency();
  const user = useCurrentUser();
  const isLoggedIn = !!user;
  const storage = useMemo(
    () => getCalcStorage<StoredState>("cost-basis", isLoggedIn, parseStored),
    [isLoggedIn],
  );
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [currentPrice, setCurrentPrice] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const prevCurrencyRef = useRef<Currency | null>(null);

  // hydrate — 로그인=D1 / 게스트=localStorage. 로그인 상태 변화 시 재로드.
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    storage.get().then((data) => {
      if (cancelled) return;
      if (data) {
        if (Array.isArray(data.rows) && data.rows.length > 0) {
          setRows(data.rows);
        }
        if (typeof data.currentPrice === "string") {
          setCurrentPrice(data.currentPrice);
        }
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  // persist — debounce 저장 (storage 내부 600ms).
  useEffect(() => {
    if (!hydrated) return;
    storage.save({ rows, currentPrice });
  }, [rows, currentPrice, hydrated, storage]);

  // flush — unmount(탭 전환) / backend 전환 직전 대기 저장 기록.
  useEffect(() => () => storage.flush(), [storage]);

  // Currency toggle: convert raw monetary inputs (row prices, currentPrice).
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

    setRows((prev) =>
      prev.map((r) => ({ ...r, price: convert(r.price) })),
    );
    setCurrentPrice(convert(currentPrice));
    prevCurrencyRef.current = currency;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, rate, hydrated]);

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalInvest = 0;
    for (const r of rows) {
      const p = parseCurrency(r.price, currency, rate);
      const q = parseNum(r.qty);
      totalQty += q;
      totalInvest += p * q;
    }
    const avgPrice = totalQty > 0 ? totalInvest / totalQty : 0;
    const cp = parseCurrency(currentPrice, currency, rate);
    const hasCurrent = currentPrice.trim() !== "" && cp > 0;
    const currentValue = hasCurrent ? cp * totalQty : null;
    const pnl = currentValue !== null ? currentValue - totalInvest : null;
    const pnlPercent =
      pnl !== null && totalInvest > 0 ? (pnl / totalInvest) * 100 : null;
    return { totalQty, totalInvest, avgPrice, currentValue, pnl, pnlPercent };
  }, [rows, currentPrice, currency, rate]);

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const formatNum = (n: number | null): string =>
    n === null ? "—" : fmt.format(n);

  const fmtCurrency = (n: number | null): string =>
    n === null ? "—" : formatCurrency(n, currency, rate);

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

  const hasAnyHolding = totals.totalQty > 0;
  const pnlColor =
    totals.pnl === null || totals.pnl === 0
      ? ""
      : totals.pnl > 0
        ? "text-[var(--color-gain)]"
        : "text-[var(--color-loss)]";
  const pnlSign =
    totals.pnl !== null && totals.pnl > 0 ? "+" : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t.inputTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
              <span>{t.priceHeader}</span>
              <span>{t.qtyHeader}</span>
              <span className="w-8" />
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.pricePlaceholder}
                  value={r.price}
                  onChange={(e) => updateRow(r.id, { price: e.target.value })}
                  className="tnum"
                />
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  placeholder={t.qtyPlaceholder}
                  value={r.qty}
                  onChange={(e) => updateRow(r.id, { qty: e.target.value })}
                  className="tnum"
                />
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
            ))}
          </div>
          <Button variant="outline" onClick={addRow} className="w-full">
            {t.addRow}
          </Button>
          <div className="space-y-1.5 border-t border-border pt-4">
            <Label htmlFor="current-price">{t.currentPriceLabel}</Label>
            <Input
              id="current-price"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder={t.currentPricePlaceholder}
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              className="tnum"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="self-start lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle>{t.resultTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAnyHolding ? (
            <p className="text-sm text-muted-foreground">{t.emptyHint}</p>
          ) : (
            <dl className="space-y-3">
              <ResultRow
                label={t.avgPrice}
                value={fmtCurrency(totals.avgPrice)}
              />
              <ResultRow
                label={t.totalQty}
                value={formatNum(totals.totalQty)}
              />
              <ResultRow
                label={t.totalInvest}
                value={fmtCurrency(totals.totalInvest)}
              />
              {totals.currentValue !== null && (
                <>
                  <ResultRow
                    label={t.currentValue}
                    value={fmtCurrency(totals.currentValue)}
                  />
                  <ResultRow
                    label={t.pnl}
                    value={
                      <span className={cn(pnlColor)}>
                        {pnlSign}
                        {fmtCurrency(totals.pnl)}
                        {totals.pnlPercent !== null && (
                          <span className="ml-2 text-sm">
                            ({pnlSign}
                            {formatNum(totals.pnlPercent)}%)
                          </span>
                        )}
                      </span>
                    }
                  />
                </>
              )}
            </dl>
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
