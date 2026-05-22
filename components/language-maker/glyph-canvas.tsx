"use client";

import { useEffect, useRef } from "react";
import { GRID_SIZE } from "@/lib/language-maker/types";
import { drawGlyph } from "@/lib/language-maker/glyph";
import { useTheme } from "@/components/theme-provider";

type Props = {
  bitmap: boolean[][];
  /** canvas 한 변 표시 픽셀 크기. */
  px: number;
  /** 픽셀 ink 색 — 미지정 시 테마 기준 자동. */
  ink?: string;
  /** 배경색 — 미지정 시 투명. */
  bg?: string;
  className?: string;
};

/** 읽기 전용 글리프 비트맵을 canvas로 렌더 (목록·매핑·미리보기 공용). */
export function GlyphCanvas({ bitmap, px, ink, bg, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const inkColor = ink ?? (theme === "dark" ? "#fafafa" : "#18181b");

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(px * dpr);
    canvas.height = Math.round(px * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, px, px);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, px, px);
    }
    drawGlyph(ctx, bitmap, 0, 0, px / GRID_SIZE, inkColor);
  }, [bitmap, px, inkColor, bg]);

  return (
    <canvas
      ref={ref}
      style={{ width: px, height: px }}
      className={className}
      aria-hidden
    />
  );
}
