/**
 * Visual asset 사전 베이킹.
 *
 * lucide 아이콘은 (iconId, tint) 조합별로 부팅 시 1회 OffscreenCanvas에 stroke한 뒤
 * ImageBitmap으로 변환해 Map에 캐시한다. render는 매 frame plain drawImage만 호출 —
 * compositing/recolor 없음.
 *
 * tint 조합은 ASSET_MANIFEST에 enumerate. 데이터 정의(EnemyDef/WeaponDef의 Visual)가
 * 사용하는 조합과 동기화 — 누락 시 render 시점에 콘솔 경고 + primitive fallback.
 */

import type { LucideIconId } from "../types";
import { getIconPaths, ICON_NODES } from "./icons";

export type VisualAssets = {
  /** key = `${iconId}|${tint}`. */
  lucide: Map<string, ImageBitmap>;
};

export const RASTER_SIZE = 64; // 베이킹 해상도 (논리 px 기준 충분히 큰 크기)

/** 데이터(enemies/weapons)에서 사용하는 (iconId, tint) 조합 — 컴파일 타임에 enumerate. */
export const ASSET_MANIFEST: { iconId: LucideIconId; tint: string }[] = [
  { iconId: "ghost", tint: "#a78bfa" }, // violet — 적1
  { iconId: "bug", tint: "#f87171" }, // red — 적2
  { iconId: "rocket", tint: "#fbbf24" }, // amber — 플레이어 (적과 색상 분리)
];

export function assetKey(iconId: LucideIconId, tint: string): string {
  return `${iconId}|${tint}`;
}

/**
 * lucide viewBox = 0..24. RASTER_SIZE 캔버스에 inset 10% 두고 stroke.
 */
function bakeIcon(iconId: LucideIconId, tint: string): OffscreenCanvas {
  const off = new OffscreenCanvas(RASTER_SIZE, RASTER_SIZE);
  const ctx = off.getContext("2d");
  if (!ctx) return off;

  const inset = RASTER_SIZE * 0.1;
  const drawSize = RASTER_SIZE - inset * 2;
  const drawScale = drawSize / 24;

  ctx.translate(inset, inset);
  ctx.scale(drawScale, drawScale);
  ctx.strokeStyle = tint;
  ctx.lineWidth = Math.max(1.8, 1.25 / drawScale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const paths = getIconPaths(ICON_NODES[iconId]);
  for (const p of paths) {
    ctx.stroke(p);
  }
  return off;
}

/**
 * 부팅 시 1회 호출. 모든 (iconId, tint) 조합 베이킹 → ImageBitmap Map.
 * SSR 환경(window 없음)에선 빈 Map 반환.
 */
export async function buildVisualAssets(): Promise<VisualAssets> {
  const lucide = new Map<string, ImageBitmap>();
  if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
    return { lucide };
  }
  for (const { iconId, tint } of ASSET_MANIFEST) {
    const off = bakeIcon(iconId, tint);
    const bmp = await createImageBitmap(off);
    lucide.set(assetKey(iconId, tint), bmp);
  }
  return { lucide };
}
