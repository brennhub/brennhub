/**
 * /releases — Union 모델 (파일 ∪ D1, D1 우선, deleted 제외).
 * server fetch 후 client-shell에 데이터 전달.
 *
 * force-dynamic 명시 — D1 read는 매 요청 fresh. 캐싱 시 admin 수정 반영 지연.
 * layout이 이미 force-dynamic이지만 페이지 레벨에도 명시 (홈 500 교훈 정합).
 *
 * AUTH_DB 미바인딩 시 파일 fallback (graceful, 사용자에게 빈 페이지 보이지 않음).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { releases as fileReleases } from "@/lib/releases";
import { listPublicReleases } from "@/lib/releases-server";
import { ReleasesClientShell } from "./client-shell";

export const dynamic = "force-dynamic";

interface AuthEnv {
  AUTH_DB?: D1Database;
}

export default async function ReleasesPage() {
  let items;
  try {
    const { env } = getCloudflareContext();
    const db = (env as unknown as AuthEnv).AUTH_DB;
    if (db) {
      items = await listPublicReleases(
        db as unknown as Parameters<typeof listPublicReleases>[0],
      );
    } else {
      // AUTH_DB 미바인딩 — 파일만으로 표시 (dev local 등).
      items = [...fileReleases].sort((a, b) => b.date.localeCompare(a.date));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("Dynamic server usage")) {
      console.error("[releases page] D1 read failed:", e);
    }
    // D1 오류 fallback — 파일로 graceful 표시 (빈 페이지 회피).
    items = [...fileReleases].sort((a, b) => b.date.localeCompare(a.date));
  }
  return <ReleasesClientShell items={items} />;
}
