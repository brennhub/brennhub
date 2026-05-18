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
  | "after-waking"
  | "before-meal"
  | "with-meal"
  | "bedtime"
  | "pre-workout"
  | "post-workout";

export type Meal = "breakfast" | "lunch" | "dinner";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type DayPreset =
  | "all"
  | "biweekly-mwf"
  | "biweekly-tts"
  | "workout"
  | "rest"
  | "weekday"
  | "weekend"
  | "custom";

export type Currency = "KRW" | "USD" | "EUR" | "JPY";

export const CURRENCIES: Currency[] = ["KRW", "USD", "EUR", "JPY"];

export type EntryStatus = "candidate" | "confirmed";

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
  "after-waking",
  "before-meal",
  "with-meal",
  "bedtime",
  "pre-workout",
  "post-workout",
];
export const MEALS: Meal[] = ["breakfast", "lunch", "dinner"];

export function stateRequiresMeal(state: IntakeState): boolean {
  return state === "before-meal" || state === "with-meal";
}

export const DAY_PRESETS: DayPreset[] = [
  "all",
  "biweekly-mwf",
  "biweekly-tts",
  "weekday",
  "weekend",
  "workout",
  "rest",
  "custom",
];

export function expandDayPreset(preset: DayPreset): DayOfWeek[] {
  switch (preset) {
    case "all":
      return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    case "biweekly-mwf":
      return ["mon", "wed", "fri"];
    case "biweekly-tts":
      return ["tue", "thu", "sat"];
    case "weekday":
      return ["mon", "tue", "wed", "thu", "fri"];
    case "weekend":
      return ["sat", "sun"];
    case "workout":
    case "rest":
    case "custom":
      return [];
  }
}
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
    meal: Meal | null;
    time: string;
  };
  days: DayOfWeek[] | DayPreset;
  dosage: {
    capsules: number | null;
    amount: string | null;
  };
  product: {
    price: string | null;
    currency: Currency | null;
    link: string | null;
  } | null;
  status: EntryStatus;
  notes: string | null;
  active: boolean;
  cycle: {
    onWeeks: number;
    offWeeks: number;
    startDate: string;
  } | null;
}

export const SCHEMA_VERSION = 3 as const;

export interface PersonalSchedule {
  schemaVersion: typeof SCHEMA_VERSION;
  entries: ScheduleEntry[];
  lastModified: number;
}

export function emptySchedule(): PersonalSchedule {
  return {
    schemaVersion: SCHEMA_VERSION,
    entries: [],
    lastModified: Date.now(),
  };
}
