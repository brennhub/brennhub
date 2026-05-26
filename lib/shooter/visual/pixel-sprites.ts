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

// --- Player ship (24×24) ---
// 좌우 대칭. 디테일: 노즈 안테나·콕핏 하이라이트·panel seam 2줄·wing tip
// notch·tail thruster outer outline. 8색 팔레트.
// palette:
//   0 transparent
//   1 hull body (slate-400)
//   2 hull outline (slate-700)
//   3 hull highlight (slate-200) — 노즈 tip
//   4 cockpit (cyan-400)
//   5 cockpit highlight (cyan-200)
//   6 thruster hot (amber-400)
//   7 thruster outer (orange-500)
//   8 panel seam (slate-800)
const PLAYER_1: PixelSprite = {
  width: 24,
  height: 24,
  palette: [
    "transparent",
    "#94a3b8",
    "#334155",
    "#e2e8f0",
    "#22d3ee",
    "#a5f3fc",
    "#fbbf24",
    "#f97316",
    "#1e293b",
  ],
  pixels: [
    // row 0 — 노즈 안테나 tip
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 1
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 2 — 노즈 cone
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 3
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 4 — 콕핏 하이라이트
    0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 5, 5, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 5 — 콕핏 코어
    0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 4, 4, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 6 — 콕핏 wide
    0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 4, 4, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 7 — 본체 상단
    0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 8
    0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
    // row 9 — panel seam 2줄
    0, 0, 0, 0, 0, 0, 2, 1, 1, 8, 1, 1, 1, 1, 8, 1, 1, 2, 0, 0, 0, 0, 0, 0,
    // row 10
    0, 0, 0, 0, 0, 2, 1, 1, 1, 8, 1, 1, 1, 1, 8, 1, 1, 1, 2, 0, 0, 0, 0, 0,
    // row 11 — wing spread
    0, 0, 0, 2, 2, 1, 1, 1, 1, 8, 1, 1, 1, 1, 8, 1, 1, 1, 1, 2, 2, 0, 0, 0,
    // row 12 — wing wider
    0, 2, 2, 1, 1, 1, 1, 1, 1, 8, 1, 1, 1, 1, 8, 1, 1, 1, 1, 1, 1, 2, 2, 0,
    // row 13 — full wing span
    2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2,
    // row 14 — wing tip notch
    2, 1, 1, 1, 1, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 1, 1, 1, 1, 2,
    // row 15 — wing tip cap
    0, 2, 2, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 2, 2, 0,
    // row 16 — 본체 tail 시작
    0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0,
    // row 17
    0, 0, 0, 0, 0, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0,
    // row 18 — rear engine hollow (검은 컷아웃)
    0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 0, 0, 0, 0, 0,
    // row 19 — rear cowl
    0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0,
    // row 20 — thruster outer
    0, 0, 0, 0, 0, 0, 0, 0, 7, 6, 6, 6, 6, 6, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 21
    0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 6, 6, 6, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 22
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 6, 6, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 23
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
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

/**
 * 베이킹 해상도 — 한 도트당 결과 픽셀 수.
 *
 * 1로 두면 ImageBitmap이 도트 grid와 1:1 (예: 24×24 sprite → 24×24px). draw 시
 * visual.width/height(논리 px)가 도트 width의 정수배이고 imageSmoothingEnabled
 * false면 nearest-neighbor upscale로 픽셀 선명. 다운스케일이면 sub-pixel
 * 정렬이 깨질 수 있으니 항상 도트 수 ≤ draw 논리 px.
 *
 * 권장 배수: visual.width = sprite.width × N (N ≥ 2). 예: 24도트 × 2 = 48 logical px.
 */
export const SPRITE_CELL_PX = 1;
