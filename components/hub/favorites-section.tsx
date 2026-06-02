"use client";

import { useCallback } from "react";
import { Star } from "lucide-react";
import type { Tool } from "@/lib/tools-registry";
import { useSortable } from "@/lib/hub/use-sortable";
import { useMessages } from "@/lib/i18n/provider";
import type { FeedbackTool } from "@/components/feedback-dialog";
import { ToolCard } from "@/components/hub/tool-card";

/**
 * 즐겨찾기 섹션 — 드래그 정렬 활성.
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
    </section>
  );
}
