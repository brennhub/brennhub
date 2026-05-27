/**
 * 게스트 → 로그인 자동 이전 헬퍼.
 * 충돌 정책 (확정 사항): D1 우선. localStorage 절대 자동 삭제 X (백업 잔존).
 *
 * 로그인 상태:
 *   1. D1 GET → row 있으면 'd1' source (localStorage 손대지 않음)
 *   2. D1 empty → localStorage 조회 → 있으면 D1에 PUT 후 'migrated' source
 *   3. 모두 empty → 'empty'
 *
 * 비로그인 상태: 호출 측이 직접 LocalStorageUserData 사용. 본 헬퍼는 로그인용.
 *
 * source 반환 → UI에서 "기기 백업 있음" 같은 토스트 분기 가능 (도구별 결정).
 */

import { D1UserData } from "./d1";
import { LocalStorageUserData } from "./localStorage";

export type MigrationSource = "d1" | "migrated" | "empty";

export interface MigrationResult<T> {
  source: MigrationSource;
  data: T | null;
}

export async function migrateOrLoadForUser<T>(
  tool: string,
  localKey: string,
): Promise<MigrationResult<T>> {
  const d1 = new D1UserData<T>(tool);
  const remote = await d1.get();
  if (remote !== null) {
    return { source: "d1", data: remote };
  }

  const local = new LocalStorageUserData<T>(localKey);
  const stored = await local.get();
  if (stored !== null) {
    await d1.save(stored);
    return { source: "migrated", data: stored };
  }

  return { source: "empty", data: null };
}
