"use client";

import { useMemo } from "react";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import {
  INTAKE_STATES,
  type CompatibilityRule,
  type DayOfWeek,
  type DayPreset,
  type IntakeState,
  type PersonalSchedule,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";

type Props = {
  schedule: PersonalSchedule | null;
  supplements: Supplement[];
  rules: CompatibilityRule[];
  onEdit: (entry: ScheduleEntry) => void;
  onDelete: (id: string) => void;
  onAddCustom: () => void;
};

const COMPAT_WINDOW_MIN = 60;

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
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

function entryName(
  e: ScheduleEntry,
  supplements: Supplement[],
  locale: "ko" | "en",
): string {
  if (e.supplementId) {
    const s = supplements.find((x) => x.id === e.supplementId);
    if (s) return locale === "ko" ? s.name_kr : s.name_en || s.name_kr;
    return e.supplementId;
  }
  return e.customName || "—";
}

type Warning = {
  entryIds: [string, string];
  rule: CompatibilityRule;
  type: CompatibilityRule["rule_type"];
};

function computeWarnings(
  entries: ScheduleEntry[],
  rules: CompatibilityRule[],
): Warning[] {
  const warnings: Warning[] = [];
  for (let i = 0; i < entries.length; i++) {
    const a = entries[i];
    if (!a.supplementId) continue;
    for (let j = i + 1; j < entries.length; j++) {
      const b = entries[j];
      if (!b.supplementId) continue;
      if (a.timing.state !== b.timing.state) continue;
      const diff = Math.abs(
        timeToMin(a.timing.time) - timeToMin(b.timing.time),
      );
      if (diff > COMPAT_WINDOW_MIN) continue;
      const rule = rules.find(
        (r) =>
          (r.supplement_a === a.supplementId &&
            r.supplement_b === b.supplementId) ||
          (r.supplement_a === b.supplementId &&
            r.supplement_b === a.supplementId),
      );
      if (rule) {
        warnings.push({
          entryIds: [a.id, b.id],
          rule,
          type: rule.rule_type,
        });
      }
    }
  }
  return warnings;
}

export function ScheduleView({
  schedule,
  supplements,
  rules,
  onEdit,
  onDelete,
  onAddCustom,
}: Props) {
  const tp = useMessages().suppPlan;
  const { locale } = useLocale();

  const grouped = useMemo(() => {
    const map = new Map<IntakeState, ScheduleEntry[]>();
    if (!schedule) return map;
    for (const s of INTAKE_STATES) map.set(s, []);
    const sorted = [...schedule.entries].sort((a, b) =>
      a.timing.time.localeCompare(b.timing.time),
    );
    for (const e of sorted) {
      const arr = map.get(e.timing.state);
      if (arr) arr.push(e);
    }
    return map;
  }, [schedule]);

  const warnings = useMemo(
    () => (schedule ? computeWarnings(schedule.entries, rules) : []),
    [schedule, rules],
  );
  const warningsByEntry = useMemo(() => {
    const m = new Map<string, Warning[]>();
    for (const w of warnings) {
      for (const id of w.entryIds) {
        const arr = m.get(id) ?? [];
        arr.push(w);
        m.set(id, arr);
      }
    }
    return m;
  }, [warnings]);

  if (!schedule) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        ...
      </div>
    );
  }

  if (schedule.entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
        <p className="text-zinc-500 dark:text-zinc-400">{tp.emptySchedule}</p>
        <button
          type="button"
          onClick={onAddCustom}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Plus className="size-3.5" />
          {tp.addEntryTitle}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAddCustom}
          className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          <Plus className="size-3.5" />
          {tp.addEntryTitle}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {INTAKE_STATES.map((s) => {
          const entries = grouped.get(s) ?? [];
          if (entries.length === 0) return null;
          return (
            <section
              key={s}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <header className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {tp[`state_${s}` as keyof typeof tp] as string}
                </h3>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {entries.length}
                </span>
              </header>
              <ul className="space-y-2">
                {entries.map((e) => {
                  const warns = warningsByEntry.get(e.id) ?? [];
                  return (
                    <li
                      key={e.id}
                      className="rounded-md border border-zinc-200 p-2 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                              {entryName(e, supplements, locale)}
                            </span>
                            <span className="tnum text-xs text-zinc-500 dark:text-zinc-400">
                              {e.timing.time}
                              {e.timing.timeEnd
                                ? `–${e.timing.timeEnd}`
                                : ""}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                            {[
                              e.dosage.capsules !== null
                                ? `${e.dosage.capsules} ${tp.capsules}`
                                : null,
                              e.dosage.amount,
                              daysToText(e.days, tp),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          {e.notes && (
                            <div className="mt-0.5 text-xs text-zinc-500 italic dark:text-zinc-500">
                              {e.notes}
                            </div>
                          )}
                          {warns.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {warns.map((w, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-1 rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[0.7rem] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                                >
                                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                  <span>
                                    {
                                      tp[
                                        `rule_${w.type}` as keyof typeof tp
                                      ] as string
                                    }
                                    {w.rule.notes ? ` — ${w.rule.notes}` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-0.5">
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
        })}
      </div>
    </div>
  );
}
