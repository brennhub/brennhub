import { getCloudflareContext } from "@opennextjs/cloudflare";
import { parseSharedPayload } from "@/lib/maze/share";
import { isValidShortId } from "@/lib/maze/share";
import type { MazeProject } from "@/lib/maze/types";
import { MazeClientShell } from "./client-shell";
import { SharedNotFound } from "@/components/maze/shared-not-found";

/**
 * 미로 만들기 + 숏링크 진입 (P4a 0.14.0).
 *
 * `?id=XXX`이 있으면 server-side D1 fetch → `parseSharedPayload`(JSON.parse +
 * `migrateSharedPayload`)로 MazeProject 복원 → client-shell에 sharedProject prop 전달.
 * 손상·구 schema·grid empty 모두 not-found fallback.
 *
 * 숏링크는 영구 스냅샷이라 향후 schema bump 시에도 구 payload가 migrate 통과해야 함 —
 * loadProject(localStorage)와 같은 경로(`migrateOrNull` 공유).
 *
 * `?id=` 없으면 기존 만들기 화면 (client-shell이 localStorage hydrate).
 */
export default async function MazePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (!id) return <MazeClientShell />;
  if (!isValidShortId(id)) return <SharedNotFound />;

  let sharedProject: MazeProject | null = null;
  try {
    // feedback API와 동일 패턴 — sync 호출. server component에서도 OpenNext 환경 정상.
    const { env } = getCloudflareContext();
    const db = (env as unknown as { MAZE_DB?: D1Database }).MAZE_DB;
    if (db) {
      const row = await db
        .prepare("SELECT payload FROM maze WHERE short_id = ?")
        .bind(id)
        .first<{ payload: string }>();
      if (row?.payload) {
        // JSON.parse + migrateSharedPayload — 손상·구 schema·grid empty 모두 null.
        sharedProject = parseSharedPayload(row.payload);
      }
    }
  } catch (e) {
    console.error("[maze share] fetch error:", e);
    sharedProject = null;
  }

  if (!sharedProject) return <SharedNotFound />;
  return <MazeClientShell sharedProject={sharedProject} />;
}
