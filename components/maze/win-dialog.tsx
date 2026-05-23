"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  open: boolean;
  onRestart: () => void;
  onBackToEdit: () => void;
};

/**
 * 승리 모달 — 도착점 도달 시 표시.
 * ResetConfirmDialog 패턴 재사용 (overlay + ESC + scroll lock).
 * ESC는 "편집으로 돌아가기"와 동작 동일 (덜 파괴적인 기본 동작).
 */
export function WinDialog({ open, onRestart, onBackToEdit }: Props) {
  const t = useMessages().maze;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBackToEdit();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onBackToEdit]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onBackToEdit();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="maze-win-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-lg">
        <div className="border-b border-border px-5 py-4">
          <h2 id="maze-win-title" className="text-lg font-semibold">
            {t.winTitle}
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">{t.winMessage}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onBackToEdit}>
            {t.playBackToEdit}
          </Button>
          <Button type="button" size="sm" onClick={onRestart}>
            {t.playRestart}
          </Button>
        </div>
      </div>
    </div>
  );
}
