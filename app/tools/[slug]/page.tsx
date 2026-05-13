import Link from "next/link";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools-registry";

export function generateStaticParams() {
  return tools
    .filter((t) => t.status === "coming-soon")
    .map((tool) => ({ slug: tool.slug }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-20">
        <Link
          href="/"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← back to brennhub
        </Link>
        <header className="mt-8">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {tool.name}
            </h1>
            <span
              className={
                tool.status === "live"
                  ? "rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                  : "rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
              }
            >
              {tool.status === "live" ? "live" : "soon"}
            </span>
          </div>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            {tool.description}
          </p>
        </header>

        <section className="mt-12 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 p-12 text-center">
          <p className="text-zinc-500 dark:text-zinc-400">Coming soon.</p>
        </section>
      </main>
    </div>
  );
}
