import Link from "next/link";
import { tools } from "@/lib/tools-registry";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-5xl px-6 py-20">
        <header className="mb-16">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            brennhub
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            indie tools by brenn — small, sharp, opinionated.
          </p>
        </header>

        {tools.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              No tools yet. The factory is warming up.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="group block h-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 transition-colors hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {tool.name}
                    </h2>
                    <span
                      className={
                        tool.status === "live"
                          ? "shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                          : "shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
                      }
                    >
                      {tool.status === "live" ? "live" : "soon"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {tool.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
