"use client";

import { useRef, useState } from "react";
import type { PointerEvent, RefObject } from "react";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/lineup-builder/types";

const DRAG_THRESHOLD_PX = 5;

type Props = {
  player: Player;
  pitchRef: RefObject<HTMLDivElement | null>;
  onMove: (id: number, top: number, left: number) => void;
  onEdit: (id: number) => void;
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function PlayerMarker({ player, pitchRef, onMove, onEdit }: Props) {
  const [dragging, setDragging] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);
  // 드래그 추적값은 re-render 불필요 → ref.
  const drag = useRef({
    startX: 0,
    startY: 0,
    startTop: 0,
    startLeft: 0,
    width: 0,
    height: 0,
    radiusX: 0,
    radiusY: 0,
    moved: false,
  });

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return;
    const half = (circleRef.current?.offsetWidth ?? 48) / 2;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTop: player.top,
      startLeft: player.left,
      width: rect.width,
      height: rect.height,
      radiusX: (half / rect.width) * 100,
      radiusY: (half / rect.height) * 100,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
    }
    const nextLeft = clamp(
      d.startLeft + (dx / d.width) * 100,
      d.radiusX,
      100 - d.radiusX,
    );
    const nextTop = clamp(
      d.startTop + (dy / d.height) * 100,
      d.radiusY,
      100 - d.radiusY,
    );
    onMove(player.id, nextTop, nextLeft);
  };

  const handlePointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    // 임계값 미만 이동 = 클릭 → 편집.
    if (!drag.current.moved) {
      onEdit(player.id);
    }
    drag.current.moved = false;
    setDragging(false);
  };

  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 select-none",
        dragging
          ? "z-10 cursor-grabbing transition-none"
          : "cursor-grab transition-[left,top] duration-300 ease-out",
      )}
      style={{
        top: `${player.top}%`,
        left: `${player.left}%`,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        ref={circleRef}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#cbd5e1] bg-[#ffffff] text-[#18181b] transition-transform sm:h-12 sm:w-12",
          dragging && "scale-105",
        )}
        style={{
          boxShadow: dragging
            ? "0 6px 16px rgba(0,0,0,0.35)"
            : "0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        <span className="text-base font-bold tabular-nums sm:text-lg">
          {player.number}
        </span>
      </div>
      <span className="absolute left-1/2 top-full mt-1 max-w-[5.5rem] -translate-x-1/2 truncate rounded bg-[rgba(0,0,0,0.6)] px-1.5 py-0.5 text-center text-[10px] font-medium text-[#ffffff] sm:text-xs">
        {player.name}
      </span>
    </div>
  );
}
