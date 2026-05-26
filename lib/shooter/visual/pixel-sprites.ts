/**
 * 픽셀아트 스프라이트 — 도트 매트릭스 정의.
 *
 * 각 sprite는 (width × height) 격자 + palette[idx → color]로 구성.
 * pixels[r*W + c] = palette index (0 = transparent).
 *
 * 베이킹 시 OffscreenCanvas에 cellPx × cellPx 정사각으로 fillRect — 결과 ImageBitmap.
 * draw 시 imageSmoothingEnabled=false 토글로 픽셀 선명도 유지 (caller 책임).
 *
 * 사전 등록된 sprite id는 SpriteId 유니온으로 폐쇄 — 데이터 정의(Visual.sprite)에서
 * 오타로 인한 silent miss 차단.
 */

export type SpriteId = "player-1" | "projectile-pulse";

export type PixelSprite = {
  /** 도트 격자 너비 (cells). */
  width: number;
  /** 도트 격자 높이 (cells). */
  height: number;
  /** 색 팔레트. 인덱스 0은 항상 transparent (값 무시). */
  palette: string[];
  /** 길이 width × height. 각 셀은 palette 인덱스. */
  pixels: number[];
};

// --- Player ship (16×16) ---
// palette:
//   0 transparent
//   1 hull body (light steel)
//   2 hull outline (slate)
//   3 highlight tip
//   4 cockpit (cyan)
//   5 thruster (amber)
const PLAYER_1: PixelSprite = {
  width: 16,
  height: 16,
  palette: [
    "transparent",
    "#cbd5e1",
    "#475569",
    "#f1f5f9",
    "#22d3ee",
    "#fbbf24",
  ],
  pixels: [
    0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 2, 4, 4, 4, 4, 2, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 2, 1, 4, 4, 1, 2, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0,
    0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0,
    0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0,
    0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0,
    2, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 2,
    2, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 2,
    0, 2, 2, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 2, 2, 0,
    0, 0, 0, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 0,
  ],
};

// --- Pulse projectile (4×10) — 길쭉한 에너지 볼트 ---
// palette:
//   0 transparent
//   1 outline (amber-orange)
//   2 hot core (cream-yellow)
const PROJECTILE_PULSE: PixelSprite = {
  width: 4,
  height: 10,
  palette: ["transparent", "#f59e0b", "#fef3c7"],
  pixels: [
    0, 1, 1, 0,
    0, 2, 2, 0,
    1, 2, 2, 1,
    1, 2, 2, 1,
    1, 2, 2, 1,
    1, 2, 2, 1,
    1, 2, 2, 1,
    1, 2, 2, 1,
    0, 2, 2, 0,
    0, 1, 1, 0,
  ],
};

export const SPRITES: Record<SpriteId, PixelSprite> = {
  "player-1": PLAYER_1,
  "projectile-pulse": PROJECTILE_PULSE,
};

/**
 * 도트 격자를 OffscreenCanvas에 베이킹. cellPx는 한 도트당 결과 픽셀 수
 * (선명도 ↑). draw 시 imageSmoothingEnabled=false로 그려야 픽셀 깨짐 없음.
 */
export function bakePixelSprite(sp: PixelSprite, cellPx: number): OffscreenCanvas {
  const off = new OffscreenCanvas(sp.width * cellPx, sp.height * cellPx);
  const ctx = off.getContext("2d");
  if (!ctx) return off;
  ctx.imageSmoothingEnabled = false;
  for (let r = 0; r < sp.height; r += 1) {
    for (let c = 0; c < sp.width; c += 1) {
      const idx = sp.pixels[r * sp.width + c];
      if (idx === 0) continue;
      ctx.fillStyle = sp.palette[idx];
      ctx.fillRect(c * cellPx, r * cellPx, cellPx, cellPx);
    }
  }
  return off;
}

/** 베이킹 해상도 — 한 도트당 결과 픽셀 수 (큰 값일수록 선명). */
export const SPRITE_CELL_PX = 6;
