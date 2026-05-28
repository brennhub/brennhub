/**
 * 로그인 사용자 storage — generic D1UserData<MazeProject> 래퍼.
 * /api/user-data/maze REST 호출 (2-1 인프라).
 *
 * ⚠️ migrate 안 함 — D1은 현 SCHEMA_VERSION 데이터만 보유 (로그인 write 경유).
 *    구schema D1 저장 방지 (supp-plan / language-maker 동일 정책).
 */

import { D1UserData } from "@/lib/user-data/d1";
import type { MazeProject } from "../types";
import type { MazeProjectStorage } from "./types";

const TOOL_SLUG = "maze";

export class D1MazeStorage implements MazeProjectStorage {
  private readonly backend = new D1UserData<MazeProject>(TOOL_SLUG);

  async getProject(): Promise<MazeProject | null> {
    return this.backend.get();
  }

  async saveProject(project: MazeProject): Promise<void> {
    await this.backend.save(project);
  }

  async clearProject(): Promise<void> {
    await this.backend.clear();
  }
}
