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

export function formatCurrency(value: number, currency: Currency): string {
  if (!Number.isFinite(value)) return currency === "krw" ? "₩0" : "$0.00";
  return currency === "krw"
    ? KRW_FORMATTER.format(value)
    : USD_FORMATTER.format(value);
}
