"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import {
  DAYS_OF_WEEK,
  DAY_PRESETS,
  INTAKE_STATES,
  type DayOfWeek,
  type DayPreset,
  type IntakeState,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplements: Supplement[];
  initial: ScheduleEntry | null;
  prefillSupplement: Supplement | null;
  onSave: (entry: ScheduleEntry) => void;
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isDayArray(d: DayOfWeek[] | DayPreset): d is DayOfWeek[] {
  return Array.isArray(d);
}

export function ScheduleForm({
  open,
  onOpenChange,
  supplements,
  initial,
  prefillSupplement,
  onSave,
}: Props) {
  const tp = useMessages().suppPlan;
  const { locale } = useLocale();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [supplementId, setSupplementId] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [state, setState] = useState<IntakeState>("with-meal");
  const [time, setTime] = useState<string>("08:00");
  const [timeEnd, setTimeEnd] = useState<string>("");
  const [daysKind, setDaysKind] = useState<DayPreset>("all");
  const [customDays, setCustomDays] = useState<DayOfWeek[]>([]);
  const [capsules, setCapsules] = useState<string>("1");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setSupplementId(initial.supplementId ?? "");
      setCustomName(initial.customName ?? "");
      setState(initial.timing.state);
      setTime(initial.timing.time);
      setTimeEnd(initial.timing.timeEnd ?? "");
      if (isDayArray(initial.days)) {
        setDaysKind("custom");
        setCustomDays(initial.days);
      } else {
        setDaysKind(initial.days);
        setCustomDays([]);
      }
      setCapsules(
        initial.dosage.capsules === null ? "" : String(initial.dosage.capsules),
      );
      setAmount(initial.dosage.amount ?? "");
      setNotes(initial.notes ?? "");
    } else {
      const supp = prefillSupplement;
      setSupplementId(supp?.id ?? "");
      setCustomName("");
      setState(supp?.recommended_state ?? "with-meal");
      setTime("08:00");
      setTimeEnd("");
      setDaysKind("all");
      setCustomDays([]);
      setCapsules("1");
      setAmount(supp?.daily_recommended ?? "");
      setNotes("");
    }
  }, [open, initial, prefillSupplement]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  const isCustom = supplementId === "";
  const canSave = isCustom ? customName.trim().length > 0 : true;

  const handleSubmit = () => {
    if (!canSave) return;
    const days: DayOfWeek[] | DayPreset =
      daysKind === "custom" ? customDays : daysKind;
    const entry: ScheduleEntry = {
      id: initial?.id ?? makeId(),
      supplementId: isCustom ? null : supplementId,
      customName: isCustom ? customName.trim() : null,
      customMeta: null,
      timing: {
        state,
        time,
        timeEnd: timeEnd || null,
      },
      days,
      dosage: {
        capsules: capsules.trim() === "" ? null : parseFloat(capsules) || null,
        amount: amount.trim() || null,
      },
      notes: notes.trim() || null,
      active: true,
      cycle: initial?.cycle ?? null,
    };
    onSave(entry);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onOpenChange(false);
      }}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {initial ? tp.editEntryTitle : tp.addEntryTitle}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={tp.cancel}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <Field label={tp.selectSupplement}>
            <select
              value={supplementId}
              onChange={(e) => setSupplementId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="">{tp.custom}</option>
              {supplements.map((s) => (
                <option key={s.id} value={s.id}>
                  {locale === "ko" ? s.name_kr : s.name_en || s.name_kr}
                </option>
              ))}
            </select>
            {isCustom && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={tp.customNamePlaceholder}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            )}
          </Field>

          <Field label={tp.state}>
            <div className="flex flex-wrap gap-1.5">
              {INTAKE_STATES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setState(s)}
                  className={chipCls(state === s)}
                >
                  {tp[`state_${s}` as keyof typeof tp] as string}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={tp.time}>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </Field>
            <Field label={tp.timeEnd}>
              <input
                type="time"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </Field>
          </div>

          <Field label={tp.days}>
            <div className="flex flex-wrap gap-1.5">
              {DAY_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDaysKind(p)}
                  className={chipCls(daysKind === p)}
                >
                  {tp[`day_${p}` as keyof typeof tp] as string}
                </button>
              ))}
            </div>
            {daysKind === "custom" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map((d) => {
                  const active = customDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setCustomDays((arr) =>
                          active ? arr.filter((x) => x !== d) : [...arr, d],
                        )
                      }
                      className={chipCls(active)}
                    >
                      {tp[`day_${d}` as keyof typeof tp] as string}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={tp.capsules}>
              <input
                type="number"
                step="any"
                min="0"
                value={capsules}
                onChange={(e) => setCapsules(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </Field>
            <Field label={tp.amount}>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000mg"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </Field>
          </div>

          <Field label={tp.notes}>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-y rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {tp.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {tp.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function chipCls(active: boolean): string {
  return [
    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800",
  ].join(" ");
}
