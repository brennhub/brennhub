"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import {
  stateRequiresMeal,
  type DayOfWeek,
  type DayPreset,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";
import { supplementDisplayName } from "@/lib/supp-plan/utils";

type Props = {
  entries: ScheduleEntry[];
  supplements: Supplement[];
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

function daysToText(
  days: DayOfWeek[] | DayPreset,
  tp: ReturnType<typeof useMessages>["suppPlan"],
): string {
  if (Array.isArray(days)) {
    return days
      .map((d) => tp[`day_${d}` as keyof typeof tp] as string)
      .join(", ");
  }
  return tp[`day_${days}` as keyof typeof tp] as string;
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

export function ScheduleTable({ entries, supplements, onEdit, onDelete }: Props) {
  const tp = useMessages().suppPlan;
  const { locale } = useLocale();

  const sorted = [...entries].sort((a, b) =>
    a.timing.time.localeCompare(b.timing.time),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-3 py-2 text-left font-medium">{tp.state}</th>
            <th className="px-3 py-2 text-left font-medium">{tp.meal}</th>
            <th className="px-3 py-2 text-left font-medium">{tp.time}</th>
            <th className="px-3 py-2 text-left font-medium">{tp.days}</th>
            <th className="px-3 py-2 text-left font-medium">
              {tp.selectSupplement}
            </th>
            <th className="px-3 py-2 text-right font-medium">{tp.capsules}</th>
            <th className="px-3 py-2 text-left font-medium">{tp.amount}</th>
            <th className="px-3 py-2 text-left font-medium">{tp.notes}</th>
            <th className="px-3 py-2 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const mealMissing =
              stateRequiresMeal(e.timing.state) && !e.timing.meal;
            return (
              <tr
                key={e.id}
                className="border-t border-zinc-200 align-top dark:border-zinc-800"
              >
                <td className="whitespace-nowrap px-3 py-2 text-zinc-700 dark:text-zinc-300">
                  {tp[`state_${e.timing.state}` as keyof typeof tp] as string}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {e.timing.meal
                    ? (tp[`meal_${e.timing.meal}` as keyof typeof tp] as string)
                    : mealMissing
                      ? (
                        <span className="text-amber-700 dark:text-amber-400">
                          {tp.notSet}
                        </span>
                      )
                      : "—"}
                </td>
                <td className="tnum whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {formatTime12(e.timing.time, tp)}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {daysToText(e.days, tp)}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-50">
                  {entryName(e, supplements, locale)}
                </td>
                <td className="tnum px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                  {e.dosage.capsules ?? "—"}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {e.dosage.amount ?? "—"}
                </td>
                <td className="max-w-[12rem] truncate px-3 py-2 text-zinc-500 italic dark:text-zinc-500">
                  {e.notes ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <div className="inline-flex gap-0.5">
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
