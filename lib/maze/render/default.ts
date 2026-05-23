import { TILE } from "../types";
import {
  getIconPaths,
  ICON_FLAG,
  ICON_USER,
  type IconNode,
} from "./icons";
import type {
  RenderEngine,
  RenderRect,
  ThemePalette,
  TileRenderer,
} from "./types";

/**
 * V1 default 렌더 엔진.
 *
 * 모든 메서드는 동기 — `ready` 미정의.
 * `ctx.setTransform`은 절대 호출 금지: 외부에서 설정한 DPR 변환을
 * 보존하기 위해 save/translate/scale/restore로만 로컬 변환.
 */

function createDefaultPalette(dark: boolean): ThemePalette {
  return {
    bg: dark ? "#27272a" : "#fafafa",
    wallInk: dark ? "#fafafa" : "#18181b",
    // 양 테마 공통 alpha — bg와 자연스럽게 블렌딩.
    startTint: "rgba(22, 163, 74, 0.18)", // emerald
    startIcon: dark ? "#34d399" : "#16a34a",
    goalTint: "rgba(225, 29, 72, 0.18)", // rose
    goalIcon: dark ? "#fb7185" : "#e11d48",
    gridLine: dark ? "#3f3f46" : "#e4e4e7",
    // 플레이어 — blue 컨벤션. 시작점(emerald)·도착점(rose)과 명확히 구분.
    playerTint: "rgba(37, 99, 235, 0.28)", // blue (alpha 약간 강 — 셀 위 덧칠)
    playerIcon: dark ? "#60a5fa" : "#2563eb",
    // 길 마크 transient — lime. start/goal/player 모두와 구분되는 컬러군.
    // alpha 0.32로 셀 내용 위에 덧칠해도 밑 글리프(start User/goal Flag) 식별 가능.
    pathMarkTint: "rgba(132, 204, 22, 0.32)",
  };
}

/**
 * 셀 내부에 Lucide 아이콘을 stroke.
 *
 * Lucide viewBox = 0..24, 기본 strokeWidth = 2.
 * 셀 내 10% inset → drawSize = 0.8 × rect.size, drawScale = drawSize / 24.
 *
 * lineWidth 도출 (시각 stroke ≥ 1.25px 보장):
 *   visualPx = lineWidth_vb × drawScale
 *   ≥ 1.25 → lineWidth_vb ≥ 1.25 / drawScale.
 * 큰 셀(drawScale가 충분히 큰 경우)에서는 Lucide 네이티브 2를 유지 (분기 일치).
 */
function strokeIcon(
  ctx: CanvasRenderingContext2D,
  icon: IconNode,
  rect: RenderRect,
  color: string,
): void {
  const inset = rect.size * 0.1;
  const drawSize = rect.size - inset * 2;
  if (drawSize <= 0) return;
  const drawScale = drawSize / 24;

  ctx.save();
  ctx.translate(rect.x + inset, rect.y + inset);
  ctx.scale(drawScale, drawScale);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, 1.25 / drawScale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const path of getIconPaths(icon)) {
    ctx.stroke(path);
  }
  ctx.restore();
}

const renderTile: TileRenderer = (ctx, tile, palette, rect) => {
  switch (tile) {
    case TILE.EMPTY:
      // bg는 clearBackground이 한 번에 처리 — 셀 단위 no-op.
      return;
    case TILE.WALL:
      ctx.fillStyle = palette.wallInk;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      return;
    case TILE.START:
      // 작은 셀(64×64 ≈ 8px)에서도 식별되도록 틴트 + 아이콘 병행.
      ctx.fillStyle = palette.startTint;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      strokeIcon(ctx, ICON_USER, rect, palette.startIcon);
      return;
    case TILE.GOAL:
      ctx.fillStyle = palette.goalTint;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      strokeIcon(ctx, ICON_FLAG, rect, palette.goalIcon);
      return;
    default:
      // V2 신규 타일(4 Trap / 5 Key / 6 Door) 추가 시 TS가 여기서 에러를 내
      // 강제 처리 — 캐스트 없이 satisfies로 컴파일 시점 가드.
      tile satisfies never;
      return;
  }
};

export function createDefaultEngine(dark: boolean): RenderEngine {
  const palette = createDefaultPalette(dark);
  return {
    palette,
    clearBackground(ctx, displayPx) {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(0, 0, displayPx, displayPx);
    },
    renderTile,
    renderPlayer(ctx, p, rect) {
      // 시작점과 동일 아이콘(User) — 같은 사람이 움직인다는 시각 일관.
      // 색만 blue로 구분. 시작점 셀 마커는 보존되므로 출발점도 함께 보인다.
      ctx.fillStyle = p.playerTint;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
      strokeIcon(ctx, ICON_USER, rect, p.playerIcon);
    },
    renderPathMark(ctx, p, rect) {
      // 셀 위 반투명 lime 오버레이 — start/goal 글리프 위에 덧칠돼도 밑이 비침.
      // 마크는 transient: "벽 생성" 커밋 시 grid에 반영되며 소거됨.
      ctx.fillStyle = p.pathMarkTint;
      ctx.fillRect(rect.x, rect.y, rect.size, rect.size);
    },
    drawGridLines(ctx, displayPx, size) {
      const cell = displayPx / size;
      ctx.strokeStyle = palette.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= size; i += 1) {
        const p = Math.round(i * cell) + 0.5;
        ctx.moveTo(p, 0);
        ctx.lineTo(p, displayPx);
        ctx.moveTo(0, p);
        ctx.lineTo(displayPx, p);
      }
      ctx.stroke();
    },
    // ready 미정의 — V1 default는 동기.
  };
}
