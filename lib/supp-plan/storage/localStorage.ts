import {
  SCHEMA_VERSION,
  type PersonalSchedule,
  type ScheduleEntry,
} from "../types";
import type { PersonalScheduleStorage } from "./types";

const KEY = "brennhub-supp-plan-schedule";

type LegacyV1Entry = {
  id: string;
  supplementId: string | null;
  customName: string | null;
  customMeta: unknown;
  timing: { state: string; time: string; timeEnd?: string | null };
  days: unknown;
  dosage: { capsules: number | null; amount: string | null };
  notes: string | null;
  active: boolean;
  cycle: unknown;
};

function migrate(raw: unknown): PersonalSchedule {
  if (!raw || typeof raw !== "object") {
    return {
      schemaVersion: SCHEMA_VERSION,
      entries: [],
      lastModified: Date.now(),
    };
  }
  const data = raw as { schemaVersion?: number; entries?: unknown };
  const version = typeof data.schemaVersion === "number" ? data.schemaVersion : 1;

  if (version === SCHEMA_VERSION) {
    return raw as PersonalSchedule;
  }

  if (version === 1) {
    const v1Entries = Array.isArray(data.entries)
      ? (data.entries as LegacyV1Entry[])
      : [];
    const entries: ScheduleEntry[] = v1Entries.map((e) => ({
      id: e.id,
      supplementId: e.supplementId,
      customName: e.customName,
      customMeta: null,
      timing: {
        state: e.timing.state as ScheduleEntry["timing"]["state"],
        meal: null,
        time: e.timing.time,
      },
      days: e.days as ScheduleEntry["days"],
      dosage: {
        capsules: e.dosage?.capsules ?? null,
        amount: e.dosage?.amount ?? null,
      },
      product: null,
      notes: e.notes ?? null,
      active: e.active ?? true,
      cycle: null,
    }));
    return {
      schemaVersion: SCHEMA_VERSION,
      entries,
      lastModified: Date.now(),
    };
  }

  // Unknown/newer schema: discard for safety.
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: [],
    lastModified: Date.now(),
  };
}

export class LocalStorageScheduleStorage implements PersonalScheduleStorage {
  async getSchedule(): Promise<PersonalSchedule | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const migrated = migrate(parsed);
      // Persist migrated form so future reads skip the migration path.
      if (
        !parsed ||
        typeof parsed !== "object" ||
        (parsed as { schemaVersion?: number }).schemaVersion !== SCHEMA_VERSION
      ) {
        localStorage.setItem(KEY, JSON.stringify(migrated));
      }
      return migrated;
    } catch {
      return null;
    }
  }

  async saveSchedule(schedule: PersonalSchedule): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(schedule));
    } catch {
      // quota or unavailable; selection still applies for the session
    }
  }

  async clearSchedule(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}

export const scheduleStorage = new LocalStorageScheduleStorage();
