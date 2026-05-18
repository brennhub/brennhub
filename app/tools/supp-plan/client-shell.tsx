"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { scheduleStorage } from "@/lib/supp-plan/storage/localStorage";
import {
  emptySchedule,
  SCHEMA_VERSION,
  stateRequiresMeal,
  type CompatibilityRule,
  type PersonalSchedule,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";
import { LibraryView } from "@/components/supp-plan/library-view";
import { ScheduleForm } from "@/components/supp-plan/schedule-form";
import {
  ScheduleView,
  type ScheduleViewMode,
} from "@/components/supp-plan/schedule-view";
import { CandidatesView } from "@/components/supp-plan/candidates-view";

const VIEW_MODE_KEY = "brennhub-supp-plan-view-mode";

type Props = {
  supplements: Supplement[];
  rules: CompatibilityRule[];
  dbError: string | null;
};

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function makeCandidate(supp: Supplement): ScheduleEntry {
  const state = supp.recommended_state ?? "with-meal";
  return {
    id: makeId(),
    supplementId: supp.id,
    customName: null,
    customMeta: null,
    timing: {
      state,
      meal: stateRequiresMeal(state) ? "breakfast" : null,
      time: "09:00",
    },
    days: "all",
    dosage: { capsules: 1, amount: null },
    product: null,
    status: "candidate",
    notes: null,
    active: true,
    cycle: null,
  };
}

export function SuppPlanClientShell({ supplements, rules, dbError }: Props) {
  const t = useMessages();
  const tp = t.suppPlan;

  const [schedule, setSchedule] = useState<PersonalSchedule>(emptySchedule());
  const [hydrated, setHydrated] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleEntry | null>(null);
  const [prefillSupp, setPrefillSupp] = useState<Supplement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("card");

  useEffect(() => {
    let cancelled = false;
    scheduleStorage.getSchedule().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setSchedule(stored);
      }
      setHydrated(true);
    });
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === "table" || stored === "card") setViewMode(stored);
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: PersonalSchedule) => {
    setSchedule(next);
    await scheduleStorage.saveSchedule(next);
  }, []);

  const handleSave = useCallback(
    async (entry: ScheduleEntry) => {
      const existing = schedule.entries.findIndex((e) => e.id === entry.id);
      const entries =
        existing >= 0
          ? schedule.entries.map((e, i) => (i === existing ? entry : e))
          : [...schedule.entries, entry];
      await persist({
        schemaVersion: SCHEMA_VERSION,
        entries,
        lastModified: Date.now(),
      });
      setEditTarget(null);
      setPrefillSupp(null);
      setFormOpen(false);
    },
    [schedule, persist],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await persist({
        schemaVersion: SCHEMA_VERSION,
        entries: schedule.entries.filter((e) => e.id !== id),
        lastModified: Date.now(),
      });
    },
    [schedule, persist],
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      await persist({
        schemaVersion: SCHEMA_VERSION,
        entries: schedule.entries.map((e) =>
          e.id === id ? { ...e, status: "confirmed" } : e,
        ),
        lastModified: Date.now(),
      });
    },
    [schedule, persist],
  );

  const handleEdit = useCallback((entry: ScheduleEntry) => {
    setEditTarget(entry);
    setPrefillSupp(null);
    setFormOpen(true);
  }, []);

  const handleAddFromLibrary = useCallback((supp: Supplement) => {
    setEditTarget(null);
    setPrefillSupp(supp);
    setFormOpen(true);
  }, []);

  const handleQuickAdd = useCallback(
    async (supp: Supplement) => {
      const candidate = makeCandidate(supp);
      await persist({
        schemaVersion: SCHEMA_VERSION,
        entries: [...schedule.entries, candidate],
        lastModified: Date.now(),
      });
    },
    [schedule, persist],
  );

  const handleAddCustom = useCallback(() => {
    setEditTarget(null);
    setPrefillSupp(null);
    setFormOpen(true);
  }, []);

  const handleChangeViewMode = useCallback((mode: ScheduleViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  }, []);

  const candidates = hydrated
    ? schedule.entries.filter((e) => e.status === "candidate")
    : [];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pt-6 pb-20">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t.toolCommon.back}
        </Link>
      </div>

      <header className="mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {tp.title}
          </h1>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {tp.local}
          </span>
        </div>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {tp.description}
        </p>
      </header>

      {dbError && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {dbError}
        </div>
      )}

      {candidates.length > 0 && (
        <section className="mb-6">
          <CandidatesView
            entries={candidates}
            supplements={supplements}
            onConfirm={handleConfirm}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {tp.mySchedule}
        </h2>
        <ScheduleView
          schedule={hydrated ? schedule : null}
          supplements={supplements}
          rules={rules}
          viewMode={viewMode}
          onChangeViewMode={handleChangeViewMode}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddCustom={handleAddCustom}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {tp.library}
        </h2>
        <LibraryView
          supplements={supplements}
          onAdd={handleAddFromLibrary}
          onQuickAdd={handleQuickAdd}
        />
      </section>

      <p className="mt-12 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        ⚠ {tp.disclaimer}
      </p>

      {formOpen && (
        <ScheduleForm
          open={formOpen}
          onOpenChange={setFormOpen}
          supplements={supplements}
          initial={editTarget}
          prefillSupplement={prefillSupp}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
