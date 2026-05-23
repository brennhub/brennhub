"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";
import { MAZE_TOOL_ICONS } from "@/lib/maze/icons";

/**
 * Step2 그리기 도구 — 0.6.1에서 "eraser" 제거 (벽 재클릭 토글이 대체).
 * 시작·도착 아이콘은 `MAZE_TOOL_ICONS` 단일 출처로 렌더러와 정합.
 */
export type Tool = "wall" | "start" | "goal";

type Props = {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
};

export function ToolPalette({ activeTool, onToolChange }: Props) {
  const t = useMessages().maze;
  const tools: { value: Tool; label: string; Icon: LucideIcon }[] = [
    { value: "wall", label: t.toolWall, Icon: MAZE_TOOL_ICONS.WALL },
    { value: "start", label: t.toolStart, Icon: MAZE_TOOL_ICONS.START },
    { value: "goal", label: t.toolGoal, Icon: MAZE_TOOL_ICONS.GOAL },
  ];
  return (
    <div role="group" aria-label="tools" className="flex flex-wrap gap-1.5">
      {tools.map(({ value, label, Icon }) => {
        const active = value === activeTool;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onToolChange(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
