"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import {
  CATEGORIES,
  INTAKE_STATES,
  SOLUBILITIES,
  type Supplement,
} from "@/lib/supp-plan/types";

type Props = {
  supplements: Supplement[];
  onAdd: (supp: Supplement) => void;
};

const ALL = "all";

export function LibraryView({ supplements, onAdd }: Props) {
  const tp = useMessages().suppPlan;
  const { locale } = useLocale();

  const [filterCategory, setFilterCategory] = useState<string>(ALL);
  const [filterSolubility, setFilterSolubility] = useState<string>(ALL);
  const [filterState, setFilterState] = useState<string>(ALL);

  const filtered = useMemo(() => {
    return supplements.filter((s) => {
      if (filterCategory !== ALL && s.category !== filterCategory) return false;
      if (filterSolubility !== ALL && s.solubility !== filterSolubility)
        return false;
      if (filterState !== ALL && s.recommended_state !== filterState)
        return false;
      return true;
    });
  }, [supplements, filterCategory, filterSolubility, filterState]);

  if (supplements.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        {tp.emptyLibrary}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <FilterSelect
          label={tp.category}
          value={filterCategory}
          onChange={setFilterCategory}
          options={CATEGORIES.map((c) => ({
            value: c,
            label: tp[`cat_${c}` as keyof typeof tp] as string,
          }))}
          allLabel={tp.filterAll}
        />
        <FilterSelect
          label={tp.solubility}
          value={filterSolubility}
          onChange={setFilterSolubility}
          options={SOLUBILITIES.map((s) => ({
            value: s,
            label: tp[`sol_${s}` as keyof typeof tp] as string,
          }))}
          allLabel={tp.filterAll}
        />
        <FilterSelect
          label={tp.state}
          value={filterState}
          onChange={setFilterState}
          options={INTAKE_STATES.map((s) => ({
            value: s,
            label: tp[`state_${s}` as keyof typeof tp] as string,
          }))}
          allLabel={tp.filterAll}
        />
        <span className="ml-auto self-end text-xs text-zinc-500 dark:text-zinc-400">
          {filtered.length} / {supplements.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const name = locale === "ko" ? s.name_kr : s.name_en || s.name_kr;
          const sub = locale === "ko" ? s.name_en : s.name_kr;
          return (
            <article
              key={s.id}
              className="flex flex-col rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {name}
                  </h3>
                  {sub && sub !== name && (
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {sub}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(s)}
                  aria-label={tp.addToSchedule}
                  title={tp.addToSchedule}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                <Badge>
                  {tp[`cat_${s.category}` as keyof typeof tp] as string}
                </Badge>
                {s.solubility && (
                  <Badge tone="blue">
                    {tp[`sol_${s.solubility}` as keyof typeof tp] as string}
                  </Badge>
                )}
                {s.recommended_state && (
                  <Badge tone="emerald">
                    {
                      tp[
                        `state_${s.recommended_state}` as keyof typeof tp
                      ] as string
                    }
                  </Badge>
                )}
              </div>

              {s.daily_recommended && (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{tp.dailyRecommended}:</span>{" "}
                  {s.daily_recommended}
                </p>
              )}
              {s.effects && (
                <p className="mt-1 line-clamp-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {s.effects}
                </p>
              )}
              {s.notes && (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500 italic dark:text-zinc-500">
                  {s.notes}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <option value={ALL}>{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({
  children,
  tone = "zinc",
}: {
  children: React.ReactNode;
  tone?: "zinc" | "blue" | "emerald";
}) {
  const cls =
    tone === "blue"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
      : tone === "emerald"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${cls}`}
    >
      {children}
    </span>
  );
}
