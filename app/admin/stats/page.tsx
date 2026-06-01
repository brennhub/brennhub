/**
 * /admin/stats — 도구별 좋아요·방문 집계 (admin only).
 * AUTH_DB 직접 쿼리. 좋아요 desc 정렬. force-dynamic (headers 사용 + 실시간 집계).
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { tools } from "@/lib/tools-registry";

export const dynamic = "force-dynamic";

type StatRow = {
  slug: string;
  name: string;
  likes: number;
  visits30d: number;
  visitsAll: number;
};

const TOOL_NAMES_KO: Record<string, string> = {
  "email-diag": "이메일 발송 진단기",
  "cron-trans": "Cron 변환기",
  "stock-sim": "주식 시뮬레이터",
  "supp-plan": "영양제 플래너",
  "saju-naming": "사주 작명",
  "lineup-builder": "축구 베스트 일레븐 만들기",
  "language-maker": "언어 창조기",
  maze: "픽셀 미로 만들기",
  shooter: "아케이드 슈터",
  "tag-it": "태그잇",
};

interface AuthEnv {
  AUTH_DB?: D1Database;
}

async function fetchStats(): Promise<{ rows: StatRow[]; error: string | null }> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as AuthEnv).AUTH_DB;
  if (!db) return { rows: [], error: "AUTH_DB binding not found" };

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  try {
    const [likes, visits30, visitsAll] = await Promise.all([
      db
        .prepare("SELECT tool_slug as slug, COUNT(*) as c FROM tool_likes GROUP BY tool_slug")
        .all<{ slug: string; c: number }>(),
      db
        .prepare(
          "SELECT tool_slug as slug, COALESCE(SUM(count), 0) as c FROM tool_visits WHERE date >= ? GROUP BY tool_slug",
        )
        .bind(since30)
        .all<{ slug: string; c: number }>(),
      db
        .prepare("SELECT tool_slug as slug, COALESCE(SUM(count), 0) as c FROM tool_visits GROUP BY tool_slug")
        .all<{ slug: string; c: number }>(),
    ]);

    const likeMap = new Map((likes.results ?? []).map((r) => [r.slug, r.c]));
    const v30Map = new Map((visits30.results ?? []).map((r) => [r.slug, r.c]));
    const vAllMap = new Map((visitsAll.results ?? []).map((r) => [r.slug, r.c]));

    const rows: StatRow[] = tools.map((t) => ({
      slug: t.slug,
      name: TOOL_NAMES_KO[t.slug] ?? t.slug,
      likes: likeMap.get(t.slug) ?? 0,
      visits30d: v30Map.get(t.slug) ?? 0,
      visitsAll: vAllMap.get(t.slug) ?? 0,
    }));

    rows.sort((a, b) => b.likes - a.likes || b.visits30d - a.visits30d);

    return { rows, error: null };
  } catch (e) {
    return { rows: [], error: (e as Error).message };
  }
}

export default async function AdminStatsPage() {
  const { rows, error } = await fetchStats();
  const isEmpty = !error && rows.every((r) => r.likes === 0 && r.visitsAll === 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          도구 통계
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          좋아요 + 방문 집계 (좋아요 desc 정렬, 30일 방문은 오늘 포함 최근 30일)
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      ) : isEmpty ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            아직 집계된 도구가 없습니다.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">도구</th>
                <th className="px-3 py-2 text-right font-medium">좋아요</th>
                <th className="px-3 py-2 text-right font-medium">30일 방문</th>
                <th className="px-3 py-2 text-right font-medium">전체 방문</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.slug}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {r.slug}
                    </span>
                  </td>
                  <td className="tnum px-3 py-2 text-right text-zinc-900 dark:text-zinc-100">
                    {r.likes.toLocaleString()}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                    {r.visits30d.toLocaleString()}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                    {r.visitsAll.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
