/**
 * supp-plan storage 통합 진입점.
 * 로그인 여부 분기 — D1 (로그인) vs localStorage (게스트).
 *
 * 정책 (Phase 2-2): 자동 이전 없음.
 *   - 로그인: D1만 read/write. D1 empty면 empty 그대로 반환 (localStorage 조회 X).
 *   - 비로그인: localStorage만. schema 마이그레이션은 LocalStorageScheduleStorage 내부 로직.
 *   - 로그아웃 후 다시 게스트 진입 시 localStorage 백업이 그대로 보임 (2-1 정책: 자동 삭제 X).
 *
 * 다중 계정 시나리오: 각 계정 D1은 독립. 게스트 localStorage는 D1과 무관 — 데이터 섞임 0.
 */

import type { PersonalSchedule } from "../types";
import { D1ScheduleStorage } from "./d1";
import { LocalStorageScheduleStorage } from "./localStorage";
import type { PersonalScheduleStorage } from "./types";

export type ScheduleSource = "d1" | "local" | "empty";

export interface LoadResult {
  source: ScheduleSource;
  data: PersonalSchedule | null;
}

export function getScheduleStorage(
  isLoggedIn: boolean,
): PersonalScheduleStorage {
  return isLoggedIn ? new D1ScheduleStorage() : new LocalStorageScheduleStorage();
}

/**
 * mount 시 1회 호출. 자동 이전 없음 — 단순히 적절한 storage에서 read.
 */
export async function loadScheduleForUser(
  isLoggedIn: boolean,
): Promise<LoadResult> {
  const storage = getScheduleStorage(isLoggedIn);
  const data = await storage.getSchedule();
  if (!data) {
    return { source: "empty", data: null };
  }
  return { source: isLoggedIn ? "d1" : "local", data };
}
