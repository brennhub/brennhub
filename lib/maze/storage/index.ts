/**
 * maze storage 통합 진입점.
 * 로그인 여부 분기 — D1 (로그인) vs localStorage (게스트).
 *
 * 정책 (supp-plan/language-maker 복제): 자동 이전 없음.
 *   - 로그인: D1만. 비로그인: localStorage만 (migrate는 localStorage 내부).
 *   - shared(?id=) 모드는 client-shell이 storage 자체를 우회 — 공유 미로를
 *     사용자 저장소에 덮어쓰지 않음.
 *
 * migrateSharedPayload 재export — 숏링크 디코드(lib/maze/share.ts)가
 * `from "./storage"`로 계속 import (재구성 후에도 경로 호환).
 */

import type { MazeProject } from "../types";
import { D1MazeStorage } from "./d1";
import { LocalStorageMazeStorage } from "./localStorage";
import type { MazeProjectStorage } from "./types";

export { migrateSharedPayload } from "./migrate";

export type MazeSource = "d1" | "local" | "empty";

export interface LoadResult {
  source: MazeSource;
  data: MazeProject | null;
}

export function getMazeStorage(isLoggedIn: boolean): MazeProjectStorage {
  return isLoggedIn ? new D1MazeStorage() : new LocalStorageMazeStorage();
}

/**
 * mount 시 1회 호출. 자동 이전 없음 — 적절한 storage에서 read만.
 * data=null이면 호출자가 newProject fallback.
 */
export async function loadProjectForUser(
  isLoggedIn: boolean,
): Promise<LoadResult> {
  const storage = getMazeStorage(isLoggedIn);
  const data = await storage.getProject();
  if (!data) {
    return { source: "empty", data: null };
  }
  return { source: isLoggedIn ? "d1" : "local", data };
}
