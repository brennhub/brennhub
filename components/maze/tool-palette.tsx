"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";
import { MAZE_TOOL_ICONS } from "@/lib/maze/icons";

/**
 * Step2 그리기 도구.
 * 변경 이력:
 *   - 0.6.1: "eraser" 제거 (벽 재클릭 토글이 대체)
 *   - 0.7.0 (P3c-2): "path" 추가 — 길 마크 그리고 "벽 생성" 버튼으로 commit
 *
 * 시작·도착 아이콘은 `MAZE_TOOL_ICONS` 단일 출처로 렌더러와 정합. PATH는 마크 자체가
 * 렌더러 글리프 없는 transient 오버레이 — 팔레트 버튼 아이콘으로만 lucide `Route` 사용.
 */
export type Tool = "wall" | "path" | "start" | "goal";

type Props = {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
};

export function ToolPalette({ activeTool, onToolChange }: Props) {
  const t = useMessages().maze;
  const tools: { value: Tool; label: string; Icon: LucideIcon }[] = [
    { value: "wall", label: t.toolWall, Icon: MAZE_TOOL_ICONS.WALL },
    { value: "path", label: t.toolPath, Icon: MAZE_TOOL_ICONS.PATH },
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
