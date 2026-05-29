/**
 * Admin shell — 사이드바 + 본문 2-column.
 * 글로벌 layout(app/layout.tsx)이 헤더(LoginButton/ThemeToggle/LocaleToggle) +
 * footer + AuthErrorToast 제공. 본 layout은 admin 영역 안쪽 shell만.
 * 보호는 middleware.ts (1-A) — 진입 시 이미 admin 검증 완료.
 */

import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 flex flex-col md:flex-row gap-6">
      <AdminSidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
