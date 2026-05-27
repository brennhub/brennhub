/**
 * 도구가 호출하는 단일 진입점 — 로그인 여부에 따라 적절한 impl 반환.
 *
 * 사용 예 (도구 client-shell):
 *   const user = useCurrentUser();
 *   const storage = getUserDataStorage<PersonalSchedule>('supp-plan',
 *     'brennhub-supp-plan-schedule', !!user);
 *   const data = await storage.get();
 *
 * 로그인 → 게스트 데이터 자동 이전은 `migrateOrLoadForUser` 별도 호출 (mount 1회).
 */

import { D1UserData } from "./d1";
import { LocalStorageUserData } from "./localStorage";
import type { UserDataStorage } from "./types";

export function getUserDataStorage<T>(
  tool: string,
  localKey: string,
  isLoggedIn: boolean,
): UserDataStorage<T> {
  return isLoggedIn ? new D1UserData<T>(tool) : new LocalStorageUserData<T>(localKey);
}
