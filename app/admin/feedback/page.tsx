import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { StatusButton } from "./status-button";

type FeedbackRow = {
  id: number;
  created_at: number;
  tool: string;
  category: string;
  message: string;
  email: string | null;
  locale: string;
  status: string;
};

const TOOL_LABEL: Record<string, string> = {
  site: "사이트 전체",
  "email-diag": "이메일 진단기",
  "cron-trans": "Cron 변환기",
  "stock-sim": "주식 시뮬레이터",
};

const CATEGORY_LABEL: Record<string, string> = {
  feature: "기능 추가",
  improvement: "기능 개선",
  complaint: "불만 사항",
  other: "그 외",
};

const STATUS_LABEL: Record<string, string> = {
  new: "새 피드백",
  read: "확인",
  resolved: "해결됨",
};

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTime(ms: number): string {
  return dateFmt.format(new Date(ms));
}

export const dynamic = "force-dynamic";

type SearchParams = {
  tool?: string;
  category?: string;
  status?: string;
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filterTool = sp.tool && TOOL_LABEL[sp.tool] ? sp.tool : "";
  const filterCategory =
    sp.category && CATEGORY_LABEL[sp.category] ? sp.category : "";
  const filterStatus =
    sp.status && STATUS_LABEL[sp.status] ? sp.status : "";

  const { env } = await getCloudflareContext({ async: true });
  const db = (env as { DB?: D1Database }).DB;

  let rows: FeedbackRow[] = [];
  let dbError: string | null = null;

  if (!db) {
    dbError = "D1 binding 'DB'를 찾을 수 없습니다.";
  } else {
    const conditions: string[] = [];
    const bindings: string[] = [];
    if (filterTool) {
      conditions.push("tool = ?");
      bindings.push(filterTool);
    }
    if (filterCategory) {
      conditions.push("category = ?");
      bindings.push(filterCategory);
    }
    if (filterStatus) {
      conditions.push("status = ?");
      bindings.push(filterStatus);
    }
    const whereClause = conditions.length
      ? ` WHERE ${conditions.join(" AND ")}`
      : "";
    const sql = `SELECT id, created_at, tool, category, message, email, locale, status FROM feedback${whereClause} ORDER BY created_at DESC`;

    try {
      const result = await db.prepare(sql).bind(...bindings).all<FeedbackRow>();
      rows = result.results ?? [];
    } catch (e) {
      dbError = (e as Error).message;
    }
  }

  const hasFilter = Boolean(filterTool || filterCategory || filterStatus);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          피드백 관리
        </h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {dbError ? "오류" : `${rows.length}건${hasFilter ? " (필터 적용)" : ""}`}
        </span>
      </header>

      <form
        method="GET"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <FilterSelect
          name="tool"
          label="도구"
          value={filterTool}
          options={TOOL_LABEL}
        />
        <FilterSelect
          name="category"
          label="종류"
          value={filterCategory}
          options={CATEGORY_LABEL}
        />
        <FilterSelect
          name="status"
          label="상태"
          value={filterStatus}
          options={STATUS_LABEL}
        />
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          필터 적용
        </button>
        {hasFilter && (
          <Link
            href="/admin/feedback"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            초기화
          </Link>
        )}
      </form>

      {dbError ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {dbError}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            피드백이 없습니다.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium">시간</th>
                <th className="px-3 py-2 text-left font-medium">도구</th>
                <th className="px-3 py-2 text-left font-medium">종류</th>
                <th className="px-3 py-2 text-left font-medium">메시지</th>
                <th className="px-3 py-2 text-left font-medium">이메일</th>
                <th className="px-3 py-2 text-left font-medium">언어</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-zinc-200 align-top dark:border-zinc-800"
                >
                  <td className="tnum whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {formatTime(r.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {TOOL_LABEL[r.tool] ?? r.tool}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </td>
                  <td className="whitespace-pre-wrap px-3 py-2 text-zinc-900 dark:text-zinc-100">
                    {r.message}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {r.email ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {r.locale}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusButton id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: Record<string, string>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <option value="">전체</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}
