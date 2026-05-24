/**
 * Visual variant → 캔버스 draw 디스패치.
 *
 * lucide-raster는 사전 베이킹된 ImageBitmap을 plain drawImage. primitive는 직접 fill.
 * sprite는 MVP 미사용 — primitive fallback.
 */

import type { Vec2, Visual } from "../types";
import { assetKey, type VisualAssets } from "./raster";

/** pos는 entity 중심 좌표. visual.size는 한 변 px (논리 좌표). */
export function drawVisual(
  ctx: CanvasRenderingContext2D,
  visual: Visual,
  pos: Vec2,
  assets: VisualAssets,
): void {
  if (visual.kind === "primitive") {
    ctx.fillStyle = visual.color;
    if (visual.shape === "rect") {
      const half = visual.size / 2;
      ctx.fillRect(pos.x - half, pos.y - half, visual.size, visual.size);
    } else {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, visual.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (visual.kind === "lucide-raster") {
    const bmp = assets.lucide.get(assetKey(visual.iconId, visual.tint));
    if (!bmp) {
      // 사전 베이킹 누락 — primitive fallback (콘솔 경고는 dev에서만).
      ctx.fillStyle = visual.tint;
      ctx.fillRect(pos.x - visual.size / 2, pos.y - visual.size / 2, visual.size, visual.size);
      return;
    }
    const half = visual.size / 2;
    ctx.drawImage(bmp, pos.x - half, pos.y - half, visual.size, visual.size);
    return;
  }
  // sprite — MVP 미사용. fallback rect.
  ctx.fillStyle = "#e4e4e7";
  ctx.fillRect(pos.x - visual.size / 2, pos.y - visual.size / 2, visual.size, visual.size);
}
