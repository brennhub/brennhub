"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { scheduleStorage } from "@/lib/supp-plan/storage/localStorage";
import {
  emptySchedule,
  type CompatibilityRule,
  type PersonalSchedule,
  type ScheduleEntry,
  type Supplement,
} from "@/lib/supp-plan/types";
import { LibraryView } from "@/components/supp-plan/library-view";
import { ScheduleForm } from "@/components/supp-plan/schedule-form";
import { ScheduleView } from "@/components/supp-plan/schedule-view";

type Props = {
  supplements: Supplement[];
  rules: CompatibilityRule[];
  dbError: string | null;
};

export function SuppPlanClientShell({ supplements, rules, dbError }: Props) {
  const t = useMessages();
  const tp = t.suppPlan;

  const [schedule, setSchedule] = useState<PersonalSchedule>(emptySchedule());
  const [hydrated, setHydrated] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleEntry | null>(null);
  const [prefillSupp, setPrefillSupp] = useState<Supplement | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    scheduleStorage.getSchedule().then((stored) => {
      if (cancelled) return;
      if (stored && stored.schemaVersion === 1) {
        setSchedule(stored);
      }
      setHydrated(true);
    });
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
        schemaVersion: 1,
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
        schemaVersion: 1,
        entries: schedule.entries.filter((e) => e.id !== id),
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

  const handleAddCustom = useCallback(() => {
    setEditTarget(null);
    setPrefillSupp(null);
    setFormOpen(true);
  }, []);

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

      <section className="mb-10">
        <h2 className="mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {tp.mySchedule}
        </h2>
        <ScheduleView
          schedule={hydrated ? schedule : null}
          supplements={supplements}
          rules={rules}
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
