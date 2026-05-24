"use client";

import { forwardRef } from "react";
import { LOGICAL_H, LOGICAL_W } from "@/lib/shooter/types";

/**
 * 게임 캔버스. 논리 좌표 LOGICAL_W × LOGICAL_H 고정.
 * DPR 처리·rAF·input 등록은 client-shell에서 effect로.
 *
 * - touch-action: none → 모바일 hold 시 스크롤·핀치 차단.
 * - tabIndex=0 + outline none → 클릭으로 키보드 포커스 얻을 수 있게.
 * - 컨테이너는 aspect-ratio로 LOGICAL_W:LOGICAL_H 유지.
 *
 * 모바일 zone hint는 캔버스 위에 overlay 2장(좌/우 반투명).
 */

type Props = {
  className?: string;
  showTouchHint?: boolean;
};

export const GameCanvas = forwardRef<HTMLCanvasElement, Props>(
  function GameCanvas({ className, showTouchHint = true }, ref) {
    return (
      <div
        className={
          "relative mx-auto w-full max-w-[360px] select-none " + (className ?? "")
        }
        style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}` }}
      >
        <canvas
          ref={ref}
          tabIndex={0}
          aria-label="Arcade Shooter game canvas"
          className="absolute inset-0 h-full w-full touch-none rounded-md outline-none ring-0 focus-visible:ring-2 focus-visible:ring-blue-400"
          style={{ imageRendering: "auto" }}
        />
        {showTouchHint && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 h-full w-1/2 rounded-l-md border border-transparent sm:hidden"
              style={{ background: "linear-gradient(to right, rgba(96,165,250,0.06), rgba(0,0,0,0))" }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-full w-1/2 rounded-r-md border border-transparent sm:hidden"
              style={{ background: "linear-gradient(to left, rgba(96,165,250,0.06), rgba(0,0,0,0))" }}
            />
          </>
        )}
      </div>
    );
  },
);
