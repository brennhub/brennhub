/**
 * 도구별 사용자 데이터 storage 추상화 (Phase 2-1).
 * 비로그인 = LocalStorageUserData / 로그인 = D1UserData.
 * 도구는 factory.ts로 적절한 impl 선택.
 */

export interface UserDataStorage<T> {
  get(): Promise<T | null>;
  save(data: T): Promise<void>;
  clear(): Promise<void>;
}
