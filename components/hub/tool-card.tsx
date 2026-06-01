"use client";

import Link from "next/link";
import {
  Clock,
  Gamepad2,
  Grid3x3,
  Mail,
  MessageSquare,
  Pill,
  Sparkles,
  Tag,
  TrendingUp,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import { isNew } from "@/lib/hub/categories";
import { useMessages } from "@/lib/i18n/provider";
import type { FeedbackTool } from "@/components/feedback-dialog";

// shooter는 main에는 없지만 dev 머지 시 자동 흡수 — 아이콘 매핑은 미리 등록.
const ICON_BY_SLUG: Record<string, LucideIcon> = {
  "email-diag": Mail,
  "cron-trans": Clock,
  "tag-it": Tag,
  "stock-sim": TrendingUp,
  "supp-plan": Pill,
  "saju-naming": Sparkles,
  "lineup-builder": Users,
  "language-maker": Type,
  maze: Grid3x3,
  shooter: Gamepad2,
};

type Props = {
  tool: Tool;
  onOpenFeedback: (slug: FeedbackTool) => void;
};

export function ToolCard({ tool, onOpenFeedback }: Props) {
  const t = useMessages();
  const display = t.tools[tool.slug] ?? { name: tool.slug, description: "" };
  const Icon = ICON_BY_SLUG[tool.slug] ?? Grid3x3;
  const isLive = tool.status === "live";
  const showNew = isLive && isNew(tool.createdAt);

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group relative block h-full rounded-lg border border-zinc-200 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {display.name}
            </h3>
            {showNew && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                {t.hub.newBadge}
              </span>
            )}
            {!isLive && (
              <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                {t.toolCommon.soon}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {display.description}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenFeedback(tool.slug as FeedbackTool);
        }}
        title={t.feedback.cardIconTooltip}
        aria-label={t.feedback.cardIconTooltip}
        className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <MessageSquare className="size-4" />
      </button>
    </Link>
  );
}
