"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  Gamepad2,
  Grid3x3,
  Mail,
  Pill,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Type,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import { useSortable } from "@/lib/hub/use-sortable";
import { useMessages } from "@/lib/i18n/provider";
import type { FeedbackTool } from "@/components/feedback-dialog";
import { ToolCard } from "@/components/hub/tool-card";

/**
 * 즐겨찾기 섹션 — 카드 전체 드래그 정렬 + portal 프리뷰.
 * 정렬 로직은 useSortable(Pointer events), 별표 표시 로직과 분리되어 추후
 * (c) 영역 외 표시 방식 전환 시 본 컴포넌트만 수정.
 */
type Props = {
  tools: Tool[];
  displayFor: (slug: string) => { name: string; description: string };
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleFavorite: (slug: string) => void;
  onOpenFeedback: (slug: FeedbackTool) => void;
};

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

export function FavoritesSection({
  tools,
  displayFor,
  onReorder,
  onToggleFavorite,
  onOpenFeedback,
}: Props) {
  const t = useMessages();

  const handleReorder = useCallback(
    (from: number, to: number) => {
      onReorder(from, to);
    },
    [onReorder],
  );

  const sortable = useSortable({
    itemCount: tools.length,
    onReorder: handleReorder,
  });

  // SSR 안전: createPortal은 mount 후에만.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const draggingTool =
    sortable.draggingIndex !== null ? tools[sortable.draggingIndex] : null;

  return (
    <section
      id="favorites"
      aria-labelledby="heading-favorites"
      className="scroll-mt-6"
    >
      <h2
        id="heading-favorites"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
      >
        <Star
          aria-hidden
          className="size-3.5 fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
        />
        {t.hub.favoritesHeading}
      </h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool, index) => (
          <li key={tool.id} data-sort-index={index}>
            <ToolCard
              tool={tool}
              isFavorite={true}
              display={displayFor(tool.slug)}
              dragHandle={{ sortable, index }}
              onToggleFavorite={onToggleFavorite}
              onOpenFeedback={onOpenFeedback}
            />
          </li>
        ))}
      </ul>

      {/* 드래그 프리뷰 — body 직속 fixed. pointer-events: none으로 통과. */}
      {mounted &&
        draggingTool &&
        sortable.previewPos &&
        createPortal(
          <DragPreview
            tool={draggingTool}
            display={displayFor(draggingTool.slug)}
            x={sortable.previewPos.x}
            y={sortable.previewPos.y}
          />,
          document.body,
        )}
    </section>
  );
}

/**
 * 드래그 중 떠다니는 카드 프리뷰 (간소화 markup).
 * pointer-events: none — 마우스/터치 이벤트는 원본 카드와 그리드에 전달.
 */
function DragPreview({
  tool,
  display,
  x,
  y,
}: {
  tool: Tool;
  display: { name: string; description: string };
  x: number;
  y: number;
}) {
  const Icon = ICON_BY_SLUG[tool.slug] ?? Grid3x3;
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate(${x - 140}px, ${y - 36}px)`,
        width: 280,
        pointerEvents: "none",
        zIndex: 100,
      }}
      className="rotate-1 rounded-lg border-2 border-amber-400 bg-white p-6 pb-3 shadow-2xl dark:bg-zinc-900"
    >
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-zinc-500 dark:text-zinc-400"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-medium text-zinc-900 dark:text-zinc-50">
            {display.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
            {display.description}
          </p>
        </div>
      </div>
    </div>
  );
}
