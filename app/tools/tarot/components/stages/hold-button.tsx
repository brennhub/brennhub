"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 꾹 눌러 확정 버튼 — 약 1.5초 홀드 + SVG 진행 링 (12시 시작).
 * 의도적 마찰 = 선택의 무게. 확인 모달 금지 — 홀드 완주가 곧 확정이다.
 * 취소(떼기/이탈/이동>12px) 시 진행은 즉시 0으로 — 감쇠 연출 없음(정직).
 */
const HOLD_MS = 1500;
const CANCEL_MOVE_PX = 12;
const RING_R = 8;
const RING_C = 2 * Math.PI * RING_R;

type HoldButtonProps = {
  label: string;
  onConfirm: () => void;
};

export function HoldButton({ label, onConfirm }: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const holdRef = useRef({ raf: 0, start: 0, startX: 0, startY: 0, holding: false, done: false });
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);
  useEffect(() => {
    const hold = holdRef.current;
    return () => cancelAnimationFrame(hold.raf);
  }, []);

  const cancelHold = () => {
    const h = holdRef.current;
    if (!h.holding) return;
    h.holding = false;
    cancelAnimationFrame(h.raf);
    setProgress(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.isPrimary) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture 실패해도 홀드 추적은 계속
    }
    const h = holdRef.current;
    h.holding = true;
    h.done = false;
    h.start = e.timeStamp; // RAF timestamp와 동일 time origin
    h.startX = e.clientX;
    h.startY = e.clientY;
    const tick = (now: number) => {
      const s = holdRef.current;
      if (!s.holding) return;
      const p = Math.min(1, (now - s.start) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        if (!s.done) {
          s.done = true;
          s.holding = false;
          onConfirmRef.current();
        }
        return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    h.raf = requestAnimationFrame(tick);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const h = holdRef.current;
    if (!h.holding || !e.isPrimary) return;
    if (Math.hypot(e.clientX - h.startX, e.clientY - h.startY) > CANCEL_MOVE_PX) cancelHold();
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "flex w-full select-none items-center justify-center gap-3 rounded-lg bg-card px-6 py-4 font-medium ring-1 ring-foreground/20 transition-colors [-webkit-touch-callout:none]",
        progress > 0 && "ring-foreground/50",
      )}
      style={{ touchAction: "none" }}
    >
      <svg viewBox="0 0 20 20" className="size-5 shrink-0 -rotate-90" aria-hidden="true">
        <circle
          cx="10"
          cy="10"
          r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-15"
        />
        <circle
          cx="10"
          cy="10"
          r={RING_R}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - progress)}
        />
      </svg>
      {label}
    </button>
  );
}
