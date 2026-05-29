/**
 * 로그인 사용자용 storage — /api/user-data/<tool> REST.
 * 쿠키 기반 세션 (credentials: 'same-origin').
 * 응답 실패 = 조용히 null (UI는 도구가 처리).
 */

import type { UserDataStorage } from "./types";

export class D1UserData<T> implements UserDataStorage<T> {
  private readonly endpoint: string;

  constructor(private readonly tool: string) {
    this.endpoint = `/api/user-data/${encodeURIComponent(tool)}`;
  }

  async get(): Promise<T | null> {
    try {
      const res = await fetch(this.endpoint, {
        method: "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { data: T | null };
      return body.data ?? null;
    } catch {
      return null;
    }
  }

  async save(data: T): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // 네트워크 실패 — 호출 측이 재시도 결정. 메모리 state는 도구가 보존.
    }
  }

  async clear(): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "DELETE",
        credentials: "same-origin",
      });
    } catch {
      // ignore
    }
  }
}
