/**
 * /admin/releases — Union 모델 admin CRUD shell.
 * Server fetch로 초기 목록 로드 후 client에 전달. router.refresh()로 mutation 후 재동기화.
 *
 * force-dynamic: D1 read를 매 요청 fresh로 — admin 작업이 캐시에 가려지지 않도록.
 * 보호: middleware.ts (/admin/* + /api/admin/* OAuth + is_admin 가드).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  listAdminReleases,
  type AdminRelease,
} from "@/lib/releases-server";
import { releases as fileReleases } from "@/lib/releases";
import { AdminReleasesClient } from "./admin-client";

export const dynamic = "force-dynamic";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

export default async function AdminReleasesPage() {
  let items: AdminRelease[] = [];
  let dbError: string | null = null;
  try {
    const { env } = getCloudflareContext();
    const db = (env as unknown as AuthEnv).AUTH_DB;
    if (!db) {
      // D1 미바인딩 — 파일만 source=file로 표시 (read-only 폴백).
      items = fileReleases
        .map((f) => ({ ...f, source: "file" as const, deleted: false }))
        .sort((a, b) => b.date.localeCompare(a.date));
      dbError = "D1 binding 'AUTH_DB'를 찾을 수 없습니다.";
    } else {
      items = await listAdminReleases(
        db as unknown as Parameters<typeof listAdminReleases>[0],
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("Dynamic server usage")) {
      console.error("[admin/releases] D1 read failed:", e);
      dbError = msg;
    }
    items = fileReleases
      .map((f) => ({ ...f, source: "file" as const, deleted: false }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  return <AdminReleasesClient initialItems={items} dbError={dbError} />;
}
