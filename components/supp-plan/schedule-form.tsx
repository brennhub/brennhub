"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { useLocale, useMessages } from "@/lib/i18n/provider";
import { NumberStepper } from "@/components/number-stepper";
import {
  CURRENCIES,
  DAYS_OF_WEEK,
  DAY_PRESETS,
  INTAKE_STATES,
  MEALS,
  stateRequiresMeal,
  type Currency,
  type DayOfWeek,
  type DayPreset,
  type EntryStatus,
  type IntakeState,
  type Meal,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";
import { defaultCurrencyForLocale } from "@/lib/supp-plan/utils";
import { SearchableSelect } from "./searchable-select";
import { TimeStepper } from "./time-stepper";

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
  const [meal, setMeal] = useState<Meal | null>(null);
  const [time, setTime] = useState<string>("08:00");
  const [daysKind, setDaysKind] = useState<DayPreset>("all");
  const [customDays, setCustomDays] = useState<DayOfWeek[]>([]);
  const [capsules, setCapsules] = useState<string>("1");
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<Currency>(
    defaultCurrencyForLocale(locale),
  );
  const [link, setLink] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<EntryStatus>("confirmed");

  const selectedSupp = useMemo(
    () =>
      supplementId
        ? (supplements.find((s) => s.id === supplementId) ?? null)
        : null,
    [supplementId, supplements],
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setSupplementId(initial.supplementId ?? "");
      setCustomName(initial.customName ?? "");
      setState(initial.timing.state);
      setMeal(initial.timing.meal ?? null);
      setTime(initial.timing.time);
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
      setPrice(initial.product?.price ?? "");
      setCurrency(
        initial.product?.currency ?? defaultCurrencyForLocale(locale),
      );
      setLink(initial.product?.link ?? "");
      setNotes(initial.notes ?? "");
      setStatus(initial.status);
    } else {
      const supp = prefillSupplement;
      setSupplementId(supp?.id ?? "");
      setCustomName("");
      setState(supp?.recommended_state ?? "with-meal");
      setMeal(null);
      setTime("08:00");
      setDaysKind("all");
      setCustomDays([]);
      setCapsules("1");
      setAmount("");
      setPrice("");
      setCurrency(defaultCurrencyForLocale(locale));
      setLink("");
      setNotes("");
      setStatus("confirmed");
    }
  }, [open, initial, prefillSupplement, locale]);

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

  // Auto-clear meal if state no longer requires it.
  useEffect(() => {
    if (!stateRequiresMeal(state) && meal !== null) {
      setMeal(null);
    }
  }, [state, meal]);

  if (!open) return null;

  const isCustom = supplementId === "";
  const canSave = isCustom ? customName.trim().length > 0 : true;

  const handleSubmit = () => {
    if (!canSave) return;
    const days: DayOfWeek[] | DayPreset =
      daysKind === "custom" ? customDays : daysKind;
    const trimmedPrice = price.trim();
    const trimmedLink = link.trim();
    const entry: ScheduleEntry = {
      id: initial?.id ?? makeId(),
      supplementId: isCustom ? null : supplementId,
      customName: isCustom ? customName.trim() : null,
      customMeta: null,
      timing: {
        state,
        meal: stateRequiresMeal(state) ? meal : null,
        time,
      },
      days,
      dosage: {
        capsules: capsules.trim() === "" ? null : parseFloat(capsules) || null,
        amount: amount.trim() || null,
      },
      product:
        trimmedPrice || trimmedLink
          ? {
              price: trimmedPrice || null,
              currency: trimmedPrice ? currency : null,
              link: trimmedLink || null,
            }
          : null,
      status,
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
            <SearchableSelect
              supplements={supplements}
              value={supplementId}
              onChange={setSupplementId}
            />
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

          {stateRequiresMeal(state) && (
            <Field label={tp.meal}>
              <div className="flex flex-wrap gap-1.5">
                {MEALS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMeal(m)}
                    className={chipCls(meal === m)}
                  >
                    {tp[`meal_${m}` as keyof typeof tp] as string}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label={tp.time}>
            <TimeStepper value={time} onChange={setTime} />
          </Field>

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
              <NumberStepper
                value={capsules}
                onStep={(n) => setCapsules(String(n))}
                onInputChange={(text) =>
                  setCapsules(text.replace(/[^\d.]/g, ""))
                }
                min={0}
                smallStep={1}
                bigStep={5}
                showBigStep={false}
                inputMode="decimal"
                aria-label={tp.capsules}
                // 1.0.1: onInputChange가 sanitize(replace) 변환 — 비숫자 입력 시
                // 기존 즉시 sanitize되어 표시되는 동작 보존.
                syncWhileFocused
              />
            </Field>
            <Field
              label={tp.amount}
              hint={
                selectedSupp?.daily_recommended
                  ? `${tp.recommendedAmountHint}: ${selectedSupp.daily_recommended}`
                  : null
              }
            >
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000mg"
                className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </Field>
          </div>

          <details
            className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            open={Boolean(price || link)}
          >
            <summary className="cursor-pointer text-xs font-medium text-zinc-600 select-none dark:text-zinc-400">
              {tp.product}
            </summary>
            <div className="mt-2 grid grid-cols-1 gap-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Field label={tp.productPrice}>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </Field>
                </div>
                <Field label={tp.productCurrency}>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {tp[`currency_${c}` as keyof typeof tp] as string}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label={tp.productLink}>
                <input
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder={tp.linkPlaceholder}
                  className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </Field>
            </div>
          </details>

          <Field label={tp.status}>
            <div className="flex flex-wrap gap-1.5">
              {(["candidate", "confirmed"] as EntryStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={chipCls(status === s)}
                >
                  {tp[`status_${s}` as keyof typeof tp] as string}
                </button>
              ))}
            </div>
          </Field>

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
  hint,
  children,
}: {
  label: string;
  hint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
        {hint && (
          <span className="group/hint relative inline-flex">
            <Info className="size-3 cursor-help text-zinc-400" />
            <span className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-1 w-48 -translate-x-1/2 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[0.7rem] font-normal text-zinc-700 opacity-0 shadow-md transition-opacity group-hover/hint:visible group-hover/hint:opacity-100 group-focus/hint:visible group-focus/hint:opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              {hint}
            </span>
          </span>
        )}
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

