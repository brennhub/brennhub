/**
 * 게스트(비로그인) storage — localStorage. schema migrate 보존.
 *
 * ⚠️ migrate는 이 경로(legacy device-local 데이터)에만. D1 경로는 migrate 안 함
 *    (로그인 write가 항상 현 SCHEMA_VERSION 보장 — 구schema D1 저장 방지).
 */

import type { MazeProject } from "../types";
import { migrateOrNull } from "./migrate";
import type { MazeProjectStorage } from "./types";

const KEY = "brennhub-maze";

export class LocalStorageMazeStorage implements MazeProjectStorage {
  async getProject(): Promise<MazeProject | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      // 손상·구schema 폐기 시 null → 호출자(client-shell)가 newProject fallback.
      return migrateOrNull(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async saveProject(project: MazeProject): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(KEY, JSON.stringify(project));
    } catch {
      // quota 초과/불가 — 세션 내 상태는 그대로 유지
    }
  }

  async clearProject(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }
}
