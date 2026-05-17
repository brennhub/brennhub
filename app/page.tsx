"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { tools } from "@/lib/tools-registry";
import { useMessages } from "@/lib/i18n/provider";
import {
  FeedbackDialog,
  type FeedbackTool,
} from "@/components/feedback-dialog";

export default function Home() {
  const t = useMessages();
  const [feedbackTool, setFeedbackTool] = useState<FeedbackTool | undefined>(
    undefined,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const openFeedback = (tool: FeedbackTool) => {
    setFeedbackTool(tool);
    setDialogOpen(true);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-10 pb-20">
      <header className="mb-16">
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
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const display = t.tools[tool.slug] ?? {
              name: tool.slug,
              description: "",
            };
            const isLive = tool.status === "live";
            return (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.slug}`}
                  className="group relative block h-full rounded-lg border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {display.name}
                    </h2>
                    <span
                      className={
                        isLive
                          ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }
                    >
                      {isLive ? t.toolCommon.live : t.toolCommon.soon}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {display.description}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openFeedback(tool.slug as FeedbackTool);
                    }}
                    title={t.feedback.cardIconTooltip}
                    aria-label={t.feedback.cardIconTooltip}
                    className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  >
                    <MessageSquare className="size-4" />
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <FeedbackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultTool={feedbackTool}
      />
    </main>
  );
}
