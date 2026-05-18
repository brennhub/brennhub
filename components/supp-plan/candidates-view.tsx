"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import {
  stateRequiresMeal,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";
import { supplementDisplayName } from "@/lib/supp-plan/utils";

type Props = {
  entries: ScheduleEntry[];
  supplements: Supplement[];
  onConfirm: (id: string) => void;
  onEdit: (entry: ScheduleEntry) => void;
  onDelete: (id: string) => void;
};

function entryName(
  e: ScheduleEntry,
  supplements: Supplement[],
  locale: "ko" | "en",
): string {
  if (e.supplementId) {
    const s = supplements.find((x) => x.id === e.supplementId);
    if (s) return supplementDisplayName(s, locale);
    return e.supplementId;
  }
  return e.customName || "—";
}

function formatTime12(
  hhmm: string,
  tp: ReturnType<typeof useMessages>["suppPlan"],
): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const pm = h >= 12;
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${pm ? tp.timePM : tp.timeAM}`;
}

export function CandidatesView({
  entries,
  supplements,
  onConfirm,
  onEdit,
  onDelete,
}: Props) {
  const tp = useMessages().suppPlan;
  const { locale } = useLocale();

  if (entries.length === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <header className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {tp.candidates}
        </h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          {entries.length}
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {entries.map((e) => {
          const mealMissing =
            stateRequiresMeal(e.timing.state) && !e.timing.meal;
          const amountMissing = !e.dosage.amount;
          return (
            <li
              key={e.id}
              className="rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {entryName(e, supplements, locale)}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                    {tp[`state_${e.timing.state}` as keyof typeof tp] as string}
                    {" · "}
                    {formatTime12(e.timing.time, tp)}
                    {" · "}
                    {e.dosage.capsules ?? "—"} {tp.capsules}
                  </div>
                  {(mealMissing || amountMissing) && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[0.7rem]">
                      {mealMissing && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {tp.mealNotSet}
                        </span>
                      )}
                      {amountMissing && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {tp.amount}: {tp.notSet}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => onConfirm(e.id)}
                    aria-label={tp.confirm}
                    title={tp.confirm}
                    className="flex h-6 w-6 items-center justify-center rounded text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    aria-label={tp.edit}
                    title={tp.edit}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(e.id)}
                    aria-label={tp.delete}
                    title={tp.delete}
                    className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-red-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-300"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
