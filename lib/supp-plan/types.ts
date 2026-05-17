export type Solubility = "water" | "fat" | "semi-fat" | "special";

export type Organ =
  | "liver"
  | "kidney"
  | "bile"
  | "gut"
  | "small-intestine"
  | "skin";

export type SupplementCategory =
  | "vitamin"
  | "mineral"
  | "amino-acid"
  | "antioxidant"
  | "structural"
  | "herbal"
  | "fatty-acid"
  | "probiotic"
  | "fermented"
  | "other";

export type IntakeState =
  | "fasting"
  | "with-meal"
  | "before-meal"
  | "bedtime"
  | "pre-workout";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DayPreset =
  | "all"
  | "workout"
  | "rest"
  | "weekday"
  | "weekend"
  | "custom";

export const SOLUBILITIES: Solubility[] = ["water", "fat", "semi-fat", "special"];
export const CATEGORIES: SupplementCategory[] = [
  "vitamin",
  "mineral",
  "amino-acid",
  "antioxidant",
  "structural",
  "herbal",
  "fatty-acid",
  "probiotic",
  "fermented",
  "other",
];
export const INTAKE_STATES: IntakeState[] = [
  "fasting",
  "with-meal",
  "before-meal",
  "bedtime",
  "pre-workout",
];
export const DAY_PRESETS: DayPreset[] = [
  "all",
  "workout",
  "rest",
  "weekday",
  "weekend",
  "custom",
];
export const DAYS_OF_WEEK: DayOfWeek[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export interface Supplement {
  id: string;
  name_kr: string;
  name_en: string | null;
  category: SupplementCategory;
  solubility: Solubility | null;
  metabolism: Organ[];
  excretion: Organ[];
  daily_recommended: string | null;
  recommended_state: IntakeState | null;
  effects: string | null;
  notes: string | null;
}

export type CompatibilityRuleType = "avoid" | "synergy" | "ratio-recommend";

export interface CompatibilityRule {
  id: number;
  supplement_a: string;
  supplement_b: string;
  rule_type: CompatibilityRuleType;
  notes: string | null;
  source: string | null;
}

export interface ScheduleEntry {
  id: string;
  supplementId: string | null;
  customName: string | null;
  customMeta: Partial<Supplement> | null;
  timing: {
    state: IntakeState;
    time: string;
    timeEnd: string | null;
  };
  days: DayOfWeek[] | DayPreset;
  dosage: {
    capsules: number | null;
    amount: string | null;
  };
  notes: string | null;
  active: boolean;
  cycle: {
    onWeeks: number;
    offWeeks: number;
    startDate: string;
  } | null;
}

export interface PersonalSchedule {
  schemaVersion: 1;
  entries: ScheduleEntry[];
  lastModified: number;
}

export function emptySchedule(): PersonalSchedule {
  return { schemaVersion: 1, entries: [], lastModified: Date.now() };
}
