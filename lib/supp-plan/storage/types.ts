import type { PersonalSchedule } from "../types";

export interface PersonalScheduleStorage {
  getSchedule(): Promise<PersonalSchedule | null>;
  saveSchedule(schedule: PersonalSchedule): Promise<void>;
  clearSchedule(): Promise<void>;
}
