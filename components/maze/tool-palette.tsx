"use client";

import { Eraser, Flag, Smile, Square, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";

/** Step2 그리기 도구. */
export type Tool = "wall" | "eraser" | "start" | "goal";

type Props = {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
};

/** Step2 도구 팔레트 — 벽 / 지우개 / 시작점 / 도착점. */
export function ToolPalette({ activeTool, onToolChange }: Props) {
  const t = useMessages().maze;
  const tools: { value: Tool; label: string; Icon: LucideIcon }[] = [
    { value: "wall", label: t.toolWall, Icon: Square },
    { value: "eraser", label: t.toolEraser, Icon: Eraser },
    { value: "start", label: t.toolStart, Icon: Smile },
    { value: "goal", label: t.toolGoal, Icon: Flag },
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
