"use client";

import { Hand, Maximize2, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  /** 현 cellPx — 한계 도달 시 +/− 버튼 disabled 판정에 사용. */
  cellPx: number;
  /** zoomLimits.min — 줌아웃 한계(현 grid fit). */
  minCellPx: number;
  /** zoomLimits.max — 줌인 한계(16맵 셀 크기). */
  maxCellPx: number;
  handMode: boolean;
  onToggleHand: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
};

/**
 * Step1(만들기) 캔버스 우상단 오버레이 — 줌 컨트롤 + 손도구 토글 (P3e-1).
 *
 * 캔버스 위 absolute 배치로 그리드 위 row를 늘리지 않음 (P3d 모바일 우려 직결).
 * 16맵은 cellPx 범위가 0이라 +/−/fit 모두 disabled (사실상 비활성 위젯).
 * 손도구는 데스크탑(스페이스 대용)·모바일 공통 — 활성 시 1포인터도 팬.
 */
export function ZoomControls({
  cellPx,
  minCellPx,
  maxCellPx,
  handMode,
  onToggleHand,
  onZoomIn,
  onZoomOut,
  onFit,
}: Props) {
  const t = useMessages().maze;
  const canZoomIn = cellPx < maxCellPx - 0.001;
  const canZoomOut = cellPx > minCellPx + 0.001;
  const canFit = Math.abs(cellPx - minCellPx) > 0.001;

  // 0.10.1: 캔버스 외부(우측) 배치로 이동 — 셀 그리기를 가리지 않게.
  // 호출자가 flex row 안에 캔버스와 나란히 둠. absolute 클래스 제거.
  return (
    <div className="flex flex-col gap-1 self-start rounded-md border border-border bg-card p-1 shadow-sm">
      <ControlButton
        label={t.viewHand}
        onClick={onToggleHand}
        active={handMode}
      >
        <Hand className="size-4" />
      </ControlButton>
      <ControlButton label={t.viewZoomIn} onClick={onZoomIn} disabled={!canZoomIn}>
        <Plus className="size-4" />
      </ControlButton>
      <ControlButton
        label={t.viewZoomOut}
        onClick={onZoomOut}
        disabled={!canZoomOut}
      >
        <Minus className="size-4" />
      </ControlButton>
      <ControlButton label={t.viewFit} onClick={onFit} disabled={!canFit}>
        <Maximize2 className="size-4" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors",
        active
          ? "bg-primary text-primary-foreground hover:bg-primary"
          : "hover:bg-muted hover:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
