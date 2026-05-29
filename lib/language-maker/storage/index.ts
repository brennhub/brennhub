/**
 * language-maker storage 통합 진입점.
 * 로그인 여부 분기 — D1 (로그인) vs localStorage (게스트).
 *
 * 정책 (supp-plan 2-2 복제): 자동 이전 없음.
 *   - 로그인: D1만 read/write. D1 empty면 empty 그대로 (localStorage 조회 X).
 *   - 비로그인: localStorage만. schema migrate는 LocalStorageLanguageStorage 내부.
 *   - 로그아웃 후 게스트 재진입 시 localStorage 백업 그대로 (자동 삭제 X).
 */

import type { LanguageProject } from "../types";
import { D1LanguageStorage } from "./d1";
import { LocalStorageLanguageStorage } from "./localStorage";
import type { LanguageProjectStorage } from "./types";

export type LanguageSource = "d1" | "local" | "empty";

export interface LoadResult {
  source: LanguageSource;
  data: LanguageProject | null;
}

export function getLanguageStorage(
  isLoggedIn: boolean,
): LanguageProjectStorage {
  return isLoggedIn
    ? new D1LanguageStorage()
    : new LocalStorageLanguageStorage();
}

/**
 * mount 시 1회 호출. 자동 이전 없음 — 적절한 storage에서 read만.
 */
export async function loadProjectForUser(
  isLoggedIn: boolean,
): Promise<LoadResult> {
  const storage = getLanguageStorage(isLoggedIn);
  const data = await storage.getProject();
  if (!data) {
    return { source: "empty", data: null };
  }
  return { source: isLoggedIn ? "d1" : "local", data };
}
