"use client";

import { useMemo, useState } from "react";
import { tools } from "@/lib/tools-registry";
import { CATEGORY_ORDER, groupByCategory } from "@/lib/hub/categories";
import { useMessages } from "@/lib/i18n/provider";
import {
  FeedbackDialog,
  type FeedbackTool,
} from "@/components/feedback-dialog";
import { ToolCard } from "@/components/hub/tool-card";

export default function Home() {
  const t = useMessages();
  const [feedbackTool, setFeedbackTool] = useState<FeedbackTool | undefined>(
    undefined,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const groups = useMemo(() => groupByCategory(tools), []);
  // 빈 카테고리는 노출 X (미래 도구 추가 전엔 섹션도 비어있음).
  const sections = CATEGORY_ORDER.filter(
    (cat) => (groups.get(cat) ?? []).length > 0,
  );

  const openFeedback = (slug: FeedbackTool) => {
    setFeedbackTool(slug);
    setDialogOpen(true);
  };

  const scrollToTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToCategory =
    (cat: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const el = document.getElementById(`category-${cat}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-10 pb-20">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          {t.hub.title}
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {t.hub.subtitle}
        </p>
      </header>

      {tools.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">{t.hub.empty}</p>
        </div>
      ) : (
        <>
          <nav
            aria-label="categories"
            className="mb-10 flex flex-wrap gap-2 border-b border-zinc-200 pb-4 dark:border-zinc-800"
          >
            <a
              href="#top"
              onClick={scrollToTop}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {t.hub.allCategory}
            </a>
            {sections.map((cat) => (
              <a
                key={cat}
                href={`#category-${cat}`}
                onClick={scrollToCategory(cat)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {t.hub.categories[cat]}
              </a>
            ))}
          </nav>

          <div className="space-y-12">
            {sections.map((cat) => {
              const list = groups.get(cat) ?? [];
              return (
                <section
                  key={cat}
                  id={`category-${cat}`}
                  aria-labelledby={`heading-${cat}`}
                  className="scroll-mt-6"
                >
                  <h2
                    id={`heading-${cat}`}
                    className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
                  >
                    {t.hub.categories[cat]}
                  </h2>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((tool) => (
                      <li key={tool.id}>
                        <ToolCard tool={tool} onOpenFeedback={openFeedback} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTool={feedbackTool}
      />
    </main>
  );
}
