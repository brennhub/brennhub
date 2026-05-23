"use client";

import { Redo2, RefreshCw, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onResetGrid: () => void;
};

/**
 * Step2 에디터 컨트롤 — undo / redo / 그리드 초기화 (P3c-1).
 *
 * 좌측 undo/redo + 우측 초기화. flex-wrap으로 모바일 좁은 폭에서 줄바꿈.
 * 키보드(Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)는 client-shell에서 별도로 바인딩 —
 * 모바일엔 키보드가 없으므로 본 위젯이 undo/redo 유일 진입점.
 */
export function EditorControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onResetGrid,
}: Props) {
  const t = useMessages().maze;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1.5">
        <ControlButton
          label={t.editorUndo}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="size-4" />
        </ControlButton>
        <ControlButton
          label={t.editorRedo}
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo2 className="size-4" />
        </ControlButton>
      </div>
      <ControlButton label={t.editorResetGrid} onClick={onResetGrid}>
        <RefreshCw className="size-4" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
        "hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
