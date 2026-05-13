"use client";

import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/types";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLocale(l)}
            aria-pressed={active}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
            )}
          >
            {LOCALE_NAMES[l]}
          </button>
        );
      })}
    </div>
  );
}
