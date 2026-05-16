"use client";

import { useColorScheme } from "@/components/color-scheme-provider";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const SCHEMES = ["kr", "us"] as const;

export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const t = useMessages().stockSim;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t.colorSchemeLabel}
      </span>
      <div
        className="inline-flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950"
        role="group"
        aria-label="Color scheme"
      >
        {SCHEMES.map((s) => {
          const active = s === colorScheme;
          const label = s === "kr" ? t.colorSchemeKr : t.colorSchemeUs;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setColorScheme(s)}
              aria-pressed={active}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
