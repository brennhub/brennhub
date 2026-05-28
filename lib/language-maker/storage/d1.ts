/**
 * 로그인 사용자 storage — generic D1UserData<LanguageProject> 래퍼.
 * /api/user-data/language-maker REST 호출 (2-1 인프라).
 *
 * ⚠️ migrate 안 함 — D1은 현 SCHEMA_VERSION 데이터만 보유 (로그인 write 경유).
 *    구schema D1 저장 방지 (supp-plan D1ScheduleStorage와 동일 정책).
 */

import { D1UserData } from "@/lib/user-data/d1";
import type { LanguageProject } from "../types";
import type { LanguageProjectStorage } from "./types";

const TOOL_SLUG = "language-maker";

export class D1LanguageStorage implements LanguageProjectStorage {
  private readonly backend = new D1UserData<LanguageProject>(TOOL_SLUG);

  async getProject(): Promise<LanguageProject | null> {
    return this.backend.get();
  }

  async saveProject(project: LanguageProject): Promise<void> {
    await this.backend.save(project);
  }

  async clearProject(): Promise<void> {
    await this.backend.clear();
  }
}
