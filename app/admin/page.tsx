/**
 * Admin 대시보드 — registry 기반 메뉴 카드.
 * 첫 항목(`/admin` 자기 자신) 제외하고 나머지를 카드로 노출.
 * Server component (shell); 카드 자체는 i18n 위해 client.
 */

import { adminMenu } from "@/lib/admin/registry";
import { AdminDashboardCard } from "@/components/admin/dashboard-card";
import { DashboardHeader } from "./dashboard-header";

export default function AdminDashboardPage() {
  const items = adminMenu.filter((item) => item.path !== "/admin");
  return (
    <div>
      <DashboardHeader />
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.path}>
            <AdminDashboardCard item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
