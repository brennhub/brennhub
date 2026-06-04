"use client";

import { Search, X } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function HubSearchInput({ value, onChange }: Props) {
  const t = useMessages();
  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.hub.searchPlaceholder}
        className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-700"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="clear"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
