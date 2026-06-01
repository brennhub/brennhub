/**
 * Admin 메뉴 registry. 새 메뉴 추가 = 본 배열에 entry 1줄.
 * 사이드바·대시보드 카드 둘 다 자동 노출. tools-registry 패턴 일관.
 */

import type { Messages } from "@/lib/i18n/messages";

export interface AdminMenuItem {
  path: string;
  labelKey: keyof Messages["admin"]["menu"];
}

export const adminMenu: AdminMenuItem[] = [
  { path: "/admin", labelKey: "dashboard" },
  { path: "/admin/feedback", labelKey: "feedback" },
  { path: "/admin/releases", labelKey: "releases" },
  { path: "/admin/stats", labelKey: "stats" },
];
