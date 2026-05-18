"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import {
  supplementDisplayName,
  supplementMatches,
  supplementSortKey,
} from "@/lib/supp-plan/utils";
import type { Supplement } from "@/lib/supp-plan/types";

type Props = {
  supplements: Supplement[];
  value: string; // supplement id, or "" for custom
  onChange: (id: string) => void;
};

const CUSTOM_VALUE = "";

export function SearchableSelect({ supplements, value, onChange }: Props) {
  const { locale } = useLocale();
  const tp = useMessages().suppPlan;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(() => {
    return [...supplements].sort((a, b) =>
      supplementSortKey(a, locale).localeCompare(
        supplementSortKey(b, locale),
        locale === "ko" ? "ko" : "en",
      ),
    );
  }, [supplements, locale]);

  const filtered = useMemo(
    () => sorted.filter((s) => supplementMatches(s, query)),
    [sorted, query],
  );

  // Options: custom first, then filtered supplements
  const options: { value: string; label: string }[] = useMemo(
    () => [
      { value: CUSTOM_VALUE, label: tp.custom },
      ...filtered.map((s) => ({
        value: s.id,
        label: supplementDisplayName(s, locale),
      })),
    ],
    [filtered, tp.custom, locale],
  );

  const selected = supplements.find((s) => s.id === value);
  const displayValue =
    value === CUSTOM_VALUE
      ? tp.custom
      : selected
        ? supplementDisplayName(selected, locale)
        : "";

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector(
      `[data-idx="${highlight}"]`,
    ) as HTMLElement | null;
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const choose = (val: string) => {
    onChange(val);
    setOpen(false);
    setQuery("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-left text-sm text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        <span className="truncate">{displayValue || tp.selectSupplement}</span>
        <ChevronDown className="size-3.5 shrink-0 text-zinc-500" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1 border-b border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder={tp.searchPlaceholder}
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="clear"
                className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
          <div
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {options.map((opt, i) => {
              const isHighlight = i === highlight;
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value || "__custom__"}
                  type="button"
                  data-idx={i}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(opt.value)}
                  className={[
                    "block w-full px-2.5 py-1.5 text-left text-sm transition-colors",
                    isHighlight
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                    isSelected
                      ? "font-medium text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-700 dark:text-zinc-300",
                    opt.value === CUSTOM_VALUE
                      ? "border-b border-zinc-200 italic dark:border-zinc-800"
                      : "",
                  ].join(" ")}
                  role="option"
                  aria-selected={isSelected}
                >
                  {opt.label}
                </button>
              );
            })}
            {options.length === 1 && (
              <p className="px-2.5 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                —
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
