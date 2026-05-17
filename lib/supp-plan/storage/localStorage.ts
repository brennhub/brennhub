import type { PersonalSchedule } from "../types";
import type { PersonalScheduleStorage } from "./types";

const KEY = "brennhub-supp-plan-schedule";

export class LocalStorageScheduleStorage implements PersonalScheduleStorage {
  async getSchedule(): Promise<PersonalSchedule | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersonalSchedule;
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
