export type Currency = "usd" | "krw";

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const KRW_FORMATTER = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

// Format a canonical USD value for display in the target currency.
// `rate` is the USD→KRW exchange rate (only used for KRW formatting).
export function formatCurrency(
  usdValue: number,
  currency: Currency,
  rate: number,
): string {
  if (!Number.isFinite(usdValue)) {
    return currency === "krw" ? "₩0" : "$0.00";
  }
  if (currency === "krw") {
    return KRW_FORMATTER.format(usdValue * rate);
  }
  return USD_FORMATTER.format(usdValue);
}

// Parse user-typed text (assumed entered in `currency`) into canonical USD.
// Strips non-numeric characters (commas, currency symbols, etc.) before parsing.
export function parseCurrency(
  text: string,
  currency: Currency,
  rate: number,
): number {
  const cleaned = text.replace(/[^0-9.\-]/g, "");
  const raw = parseFloat(cleaned);
  if (!Number.isFinite(raw)) return 0;
  if (currency === "krw") {
    return rate > 0 ? raw / rate : 0;
  }
  return raw;
}
