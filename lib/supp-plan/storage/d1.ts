/**
 * 로그인 사용자 schedule storage — generic D1UserData<PersonalSchedule> 래퍼.
 * /api/user-data/supp-plan REST 호출 (2-1 인프라).
 * PersonalScheduleStorage 인터페이스 구현 → client-shell이 분기 없이 동일 메서드 호출.
 */

import { D1UserData } from "@/lib/user-data/d1";
import type { PersonalSchedule } from "../types";
import type { PersonalScheduleStorage } from "./types";

const TOOL_SLUG = "supp-plan";

export class D1ScheduleStorage implements PersonalScheduleStorage {
  private readonly backend = new D1UserData<PersonalSchedule>(TOOL_SLUG);

  async getSchedule(): Promise<PersonalSchedule | null> {
    return this.backend.get();
  }

  async saveSchedule(schedule: PersonalSchedule): Promise<void> {
    await this.backend.save(schedule);
  }

  async clearSchedule(): Promise<void> {
    await this.backend.clear();
  }
}
