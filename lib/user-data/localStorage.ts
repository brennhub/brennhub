/**
 * 비로그인 게스트용 storage — localStorage.
 * key는 도구가 지정 (`brennhub-<tool>-<purpose>` 컨벤션 권장).
 * 기존 도구 localStorage 키 그대로 사용 가능 = 마이그레이션 시 호환.
 */

import type { UserDataStorage } from "./types";

export class LocalStorageUserData<T> implements UserDataStorage<T> {
  constructor(private readonly key: string) {}

  async get(): Promise<T | null> {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async save(data: T): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // QuotaExceededError 등 — 조용히 무시 (도구가 메모리에 보관).
    }
  }

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}
