"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Step2 → Step1 되돌아가기 확인 모달.
 * 사이즈가 잠겨 있으므로 설정으로 돌아가면 맵을 전면 리셋한다.
 * feedback-dialog / pixel-editor 모달 패턴 재사용 (overlay + ESC + scroll lock).
 */
export function ResetConfirmDialog({ open, onConfirm, onCancel }: Props) {
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
            {t.resetTitle}
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-muted-foreground">{t.resetMessage}</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t.resetCancel}
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            {t.resetConfirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
