"use client";

/**
 * 현재 사용자 Context — layout이 server-side에서 1회 조회한 user를 client 전체에 노출.
 * useCurrentUser() 훅으로 도구 client-shell이 로그인 여부 분기 가능.
 * AuthUser는 type-only import (server 도메인이지만 type 사용은 안전).
 */

import { createContext, useContext, type ReactNode } from "react";
import type { AuthUser } from "@/lib/auth/session";

const UserContext = createContext<AuthUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): AuthUser | null {
  return useContext(UserContext);
}
