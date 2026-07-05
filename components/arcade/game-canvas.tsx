"use client";

import { forwardRef, type ReactNode } from "react";

/**
 * Arcade 단일 캔버스 element.
 *
 * - 컨테이너 aspect-ratio = 1 / aspect (aspect = 게임의 H/W 비율, Engine.getAspect).
 * - 논리치수·DPR·backing·transform은 client-shell fitCanvas가 결정 (여긴 element만).
 * - rAF·입력 등록은 Engine이 담당.
 * - touch-none → 모바일 드래그 조준 시 스크롤/핀치 차단.
 * - children — 캔버스 위 absolute overlay 자리(현재 미사용, 게임이 canvas에 직접 그림).
 */
type Props = {
  aspect: number;
  className?: string;
  children?: ReactNode;
};

export const GameCanvas = forwardRef<HTMLCanvasElement, Props>(function GameCanvas(
  { aspect, className, children },
  ref,
) {
  return (
    <div
      className={"relative mx-auto w-full max-w-[420px] select-none " + (className ?? "")}
      style={{ aspectRatio: `1 / ${aspect}` }}
    >
      <canvas
        ref={ref}
        tabIndex={0}
        aria-label="Arcade game canvas"
        className="absolute inset-0 h-full w-full touch-none rounded-md outline-none ring-0 focus-visible:ring-2 focus-visible:ring-amber-400 [image-rendering:pixelated]"
      />
      {children}
    </div>
  );
});
