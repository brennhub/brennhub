import type { Locale } from "@/lib/i18n/types";
import type { Currency, Supplement } from "./types";

export function supplementDisplayName(
  s: Supplement,
  locale: Locale,
): string {
  if (locale === "en") return s.name_en || s.name_kr;
  if (s.name_en && s.name_en !== s.name_kr) {
    return `${s.name_kr} (${s.name_en})`;
  }
  return s.name_kr;
}

export function supplementSortKey(s: Supplement, locale: Locale): string {
  return locale === "en" ? s.name_en || s.name_kr : s.name_kr;
}

export function supplementMatches(s: Supplement, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    s.name_kr.toLowerCase().includes(needle) ||
    (s.name_en?.toLowerCase().includes(needle) ?? false)
  );
}

export function defaultCurrencyForLocale(locale: Locale): Currency {
  return locale === "ko" ? "KRW" : "USD";
}

export function formatPrice(
  price: string | null,
  currency: Currency | null,
  fallbackLocale: Locale,
): string {
  if (!price) return "";
  const cur: Currency = currency ?? defaultCurrencyForLocale(fallbackLocale);
  const num = parseFloat(price);
  if (!Number.isFinite(num)) return price;
  switch (cur) {
    case "KRW":
      return `${num.toLocaleString("ko-KR")}원`;
    case "USD":
      return `$${num.toFixed(2)}`;
    case "EUR":
      return `€${num.toFixed(2)}`;
    case "JPY":
      return `¥${num.toLocaleString("ja-JP")}`;
  }
}
