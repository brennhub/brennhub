"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * 신규(P3c-1) — props 일반화. 미지정 시 기존 maze.resetTitle 등을 사용해
   * Step2→Step1 모달과 호환 (기존 호출부 무변경).
   * P3c-1의 "그리드 초기화" 모달은 maze.resetGrid* 키를 명시 전달.
   */
  title?: string;
  message?: string;
  confirmLabel?: string;
};

/**
 * 일반화된 확인 모달 — feedback-dialog / pixel-editor 모달 패턴 (overlay + ESC + scroll lock).
 *
 * 사용처:
 *   1. Step2 → Step1 (사이즈 잠금 풀고 grid 비움, props 기본값)
 *   2. P3c-1 그리드 초기화 (Step2 유지하며 grid만 비움, props 명시 전달)
 */
export function ResetConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
}: Props) {
  const t = useMessages().maze;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="maze-reset-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-lg">
        <div className="border-b border-border px-5 py-4">
          <h2 id="maze-reset-title" className="text-lg font-semibold">
            {title ?? t.resetTitle}
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">
            {message ?? t.resetMessage}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t.resetCancel}
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            {confirmLabel ?? t.resetConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
