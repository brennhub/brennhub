"use client";

import { forwardRef, type ReactNode } from "react";
import { LOGICAL_H, LOGICAL_W } from "@/lib/shooter/types";

/**
 * 게임 캔버스. 논리 좌표 LOGICAL_W × LOGICAL_H 고정.
 * DPR 처리·rAF·input 등록은 client-shell에서 effect로.
 *
 * - touch-action: none → 모바일 hold 시 스크롤·핀치 차단.
 * - tabIndex=0 + outline none → 클릭으로 키보드 포커스 얻을 수 있게.
 * - 컨테이너는 aspect-ratio로 LOGICAL_W:LOGICAL_H 유지.
 * - 데스크탑은 컨테이너 폭을 더 크게 (sm/lg breakpoint), 모바일은 360 유지.
 * - children — 캔버스 위에 absolute로 띄울 overlay (게임오버 dim 등).
 *
 * 모바일 zone hint는 캔버스 위에 overlay 2장(좌/우 반투명).
 */

type Props = {
  className?: string;
  showTouchHint?: boolean;
  children?: ReactNode;
};

export const GameCanvas = forwardRef<HTMLCanvasElement, Props>(
  function GameCanvas({ className, showTouchHint = true, children }, ref) {
    return (
      <div
        className={
          "relative mx-auto w-full max-w-[360px] select-none sm:max-w-[420px] lg:max-w-[480px] " +
          (className ?? "")
        }
        style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}` }}
      >
        <canvas
          ref={ref}
          tabIndex={0}
          aria-label="Arcade Shooter game canvas"
          className="absolute inset-0 h-full w-full touch-none rounded-md outline-none ring-0 focus-visible:ring-2 focus-visible:ring-amber-400"
          // 브라우저의 backing → CSS scale도 nearest로 강제. 픽셀 grid 보존.
          // sprite·lucide raster 모두 영향 — 적은 RASTER_SIZE 128로 high-res 베이크.
          style={{ imageRendering: "pixelated" }}
        />
        {showTouchHint && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 h-full w-1/2 rounded-l-md border border-transparent sm:hidden"
              style={{ background: "linear-gradient(to right, rgba(251,191,36,0.06), rgba(0,0,0,0))" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-full w-1/2 rounded-r-md border border-transparent sm:hidden"
              style={{ background: "linear-gradient(to left, rgba(251,191,36,0.06), rgba(0,0,0,0))" }}
            />
          </>
        )}
        {children}
      </div>
    );
  },
);
