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

type LegacyV2Entry = Omit<ScheduleEntry, "status" | "product"> & {
  product?: {
    price: string | null;
    link: string | null;
  } | null;
};

function v1ToV2Entry(e: LegacyV1Entry): LegacyV2Entry {
  return {
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
  };
}

function v2ToV3Entry(e: LegacyV2Entry): ScheduleEntry {
  return {
    ...e,
    product: e.product
      ? { price: e.product.price, currency: null, link: e.product.link }
      : null,
    status: "confirmed",
  };
}

function migrate(raw: unknown): PersonalSchedule {
  if (!raw || typeof raw !== "object") {
    return {
      schemaVersion: SCHEMA_VERSION,
      entries: [],
      lastModified: Date.now(),
    };
  }
  const data = raw as { schemaVersion?: number; entries?: unknown };
  const version =
    typeof data.schemaVersion === "number" ? data.schemaVersion : 1;

  if (version === SCHEMA_VERSION) {
    return raw as PersonalSchedule;
  }

  let v2Entries: LegacyV2Entry[];
  if (version === 1) {
    const v1Entries = Array.isArray(data.entries)
      ? (data.entries as LegacyV1Entry[])
      : [];
    v2Entries = v1Entries.map(v1ToV2Entry);
  } else if (version === 2) {
    v2Entries = Array.isArray(data.entries)
      ? (data.entries as LegacyV2Entry[])
      : [];
  } else {
    // Unknown/newer schema: discard for safety.
    return {
      schemaVersion: SCHEMA_VERSION,
      entries: [],
      lastModified: Date.now(),
    };
  }

  const entries: ScheduleEntry[] = v2Entries.map(v2ToV3Entry);
  return {
    schemaVersion: SCHEMA_VERSION,
    entries,
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
