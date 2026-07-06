"use client";

/**
 * 서버(layout)가 판정한 prod 여부를 client 트리에 노출 — 홈 그리드의 devOnly 도구 게이트용.
 * UserProvider와 동일 패턴 (server read → Context). 기본값 false = 비-prod(전체 노출).
 */

import { createContext, useContext, type ReactNode } from "react";

const IsProdContext = createContext<boolean>(false);

export function EnvProvider({ isProd, children }: { isProd: boolean; children: ReactNode }) {
  return <IsProdContext.Provider value={isProd}>{children}</IsProdContext.Provider>;
}

export function useIsProd(): boolean {
  return useContext(IsProdContext);
}
