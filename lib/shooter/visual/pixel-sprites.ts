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

// --- Player ship (24×24, v2) ---
// 입체감 강화: 본체 가장자리 hull shadow + 중앙 highlight ridge로 좌우 음영.
// 콕핏 raised (row 6에서 highlight가 위로 솟구침). 엔진 완전 리디자인 —
// rear hollow 안에 red 글로우, 그 아래 5단 그라데이션 thruster cone
// (red → orange → amber → yellow → white-hot core).
// palette (13색):
//   0  transparent
//   1  hull mid           (slate-400)
//   2  hull outline       (slate-800) — 가장 짙은 윤곽
//   3  hull highlight     (slate-200) — 중앙 능선 + 노즈 tip
//   4  cockpit core       (cyan-400)
//   5  cockpit highlight  (cyan-200)
//   6  thruster hot core  (yellow-100)
//   7  thruster yellow    (yellow-300)
//   8  thruster amber     (amber-400)
//   9  thruster orange    (orange-500)
//   10 thruster red       (red-600)
//   11 hull shadow        (slate-500) — 본체 음영
//   12 panel seam         (slate-700)
const PLAYER_1: PixelSprite = {
  width: 24,
  height: 24,
  palette: [
    "transparent",
    "#94a3b8",
    "#1e293b",
    "#e2e8f0",
    "#22d3ee",
    "#a5f3fc",
    "#fef9c3",
    "#fde047",
    "#fbbf24",
    "#f97316",
    "#dc2626",
    "#64748b",
    "#334155",
  ],
  pixels: [
    // row 0 — 노즈 안테나 tip
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 1
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 2 — 노즈 cone tip highlight
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 3
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 4 — 콕핏 하이라이트
    0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 5, 5, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 5 — 콕핏 코어
    0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 4, 4, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 6 — 콕핏 raised (양 옆 highlight 솟구침)
    0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 4, 5, 5, 4, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 7 — 콕핏 wide base
    0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 4, 4, 4, 4, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 8 — 본체 시작, 가장자리 hull shadow + 중앙 ridge
    0, 0, 0, 0, 0, 0, 0, 2, 11, 1, 1, 3, 3, 1, 1, 11, 2, 0, 0, 0, 0, 0, 0, 0,
    // row 9
    0, 0, 0, 0, 0, 0, 2, 11, 1, 1, 1, 3, 3, 1, 1, 1, 11, 2, 0, 0, 0, 0, 0, 0,
    // row 10
    0, 0, 0, 0, 0, 2, 11, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 11, 2, 0, 0, 0, 0, 0,
    // row 11 — wing spread + panel seam 2줄
    0, 0, 0, 2, 2, 11, 1, 1, 1, 12, 1, 3, 3, 1, 12, 1, 1, 1, 11, 2, 2, 0, 0, 0,
    // row 12 — wing wider
    0, 2, 2, 11, 1, 1, 1, 1, 1, 12, 1, 1, 1, 1, 12, 1, 1, 1, 1, 11, 2, 2, 0, 0,
    // row 13 — full wing span (가장자리 hull shadow band)
    2, 11, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 11, 2,
    // row 14 — wing tip notch
    2, 11, 1, 1, 1, 0, 0, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 0, 0, 1, 1, 1, 11, 2,
    // row 15 — wing tip cap + tail core 시작
    0, 2, 2, 0, 0, 0, 0, 0, 2, 1, 11, 1, 1, 11, 1, 2, 0, 0, 0, 0, 0, 2, 2, 0,
    // row 16 — 본체 tail
    0, 0, 0, 0, 0, 0, 0, 2, 11, 1, 1, 1, 1, 1, 1, 11, 2, 0, 0, 0, 0, 0, 0, 0,
    // row 17 — tail 좁아짐
    0, 0, 0, 0, 0, 0, 2, 11, 1, 1, 1, 1, 1, 1, 1, 1, 11, 2, 0, 0, 0, 0, 0, 0,
    // row 18 — 엔진 입구 red glow (orange 양쪽 trim)
    0, 0, 0, 0, 0, 2, 11, 1, 9, 10, 10, 10, 10, 10, 10, 9, 1, 11, 2, 0, 0, 0, 0, 0,
    // row 19 — 엔진 cowl + 깊은 red 글로우
    0, 0, 0, 0, 0, 0, 2, 2, 9, 10, 10, 10, 10, 10, 10, 9, 2, 2, 0, 0, 0, 0, 0, 0,
    // row 20 — thruster cone widest (red→orange→amber→yellow→white)
    0, 0, 0, 0, 0, 0, 0, 9, 10, 8, 7, 6, 6, 7, 8, 10, 9, 0, 0, 0, 0, 0, 0, 0,
    // row 21 — cone 좁아짐 (hot core 보존)
    0, 0, 0, 0, 0, 0, 0, 0, 9, 8, 7, 6, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 22
    0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 8, 7, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    // row 23 — cone tip
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 8, 8, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
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
