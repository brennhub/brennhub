/**
 * Lucide 아이콘 iconNode — 캔버스 Path2D 렌더용.
 *
 * Source: lucide-react v1.14.0 — ISC License.
 * https://github.com/lucide-icons/lucide
 * Copyright (c) Lucide Contributors.
 *
 * iconNode 구조는 라이브러리 원본 형식을 보존 (근사·재구성 없음).
 * lucide 측 정의 갱신 시 동일 형식으로 동기화.
 *
 * 추출 출처: node_modules/lucide-react/dist/esm/icons/{ghost,bug}.mjs
 * (rocket은 sprite로 교체되어 제거됨.)
 *
 * maze 도구의 lib/maze/render/icons.ts 패턴 동일 — 동일 임베드 방식.
 */

import type { LucideIconId } from "../types";

export type IconAttrs = Record<string, string | number>;
export type IconNode = ReadonlyArray<readonly [string, IconAttrs]>;

/** lucide-react v1.14.0 — icons/ghost.mjs */
const ICON_GHOST: IconNode = [
  ["path", { d: "M9 10h.01" }],
  ["path", { d: "M15 10h.01" }],
  [
    "path",
    {
      d: "M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z",
    },
  ],
];

/** lucide-react v1.14.0 — icons/bug.mjs */
const ICON_BUG: IconNode = [
  ["path", { d: "M12 20v-9" }],
  ["path", { d: "M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z" }],
  ["path", { d: "M14.12 3.88 16 2" }],
  ["path", { d: "M21 21a4 4 0 0 0-3.81-4" }],
  ["path", { d: "M21 5a4 4 0 0 1-3.55 3.97" }],
  ["path", { d: "M22 13h-4" }],
  ["path", { d: "M3 21a4 4 0 0 1 3.81-4" }],
  ["path", { d: "M3 5a4 4 0 0 0 3.55 3.97" }],
  ["path", { d: "M6 13H2" }],
  ["path", { d: "m8 2 1.88 1.88" }],
  ["path", { d: "M9 7.13V6a3 3 0 1 1 6 0v1.13" }],
];

export const ICON_NODES: Record<LucideIconId, IconNode> = {
  ghost: ICON_GHOST,
  bug: ICON_BUG,
};

/** lucide iconNode 원소 1개를 Path2D로 변환. path/circle/line/rect 지원. */
function pathFromNode(node: readonly [string, IconAttrs]): Path2D | null {
  const [el, attrs] = node;
  switch (el) {
    case "path":
      return new Path2D(String(attrs.d ?? ""));
    case "circle": {
      const p = new Path2D();
      p.arc(Number(attrs.cx), Number(attrs.cy), Number(attrs.r), 0, Math.PI * 2);
      return p;
    }
    case "line": {
      const p = new Path2D();
      p.moveTo(Number(attrs.x1), Number(attrs.y1));
      p.lineTo(Number(attrs.x2), Number(attrs.y2));
      return p;
    }
    case "rect": {
      const p = new Path2D();
      p.rect(
        Number(attrs.x),
        Number(attrs.y),
        Number(attrs.width),
        Number(attrs.height),
      );
      return p;
    }
    default:
      return null;
  }
}

/** IconNode → Path2D[] 캐시. */
const pathCache = new WeakMap<IconNode, Path2D[]>();

export function getIconPaths(icon: IconNode): Path2D[] {
  let cached = pathCache.get(icon);
  if (!cached) {
    cached = icon
      .map(pathFromNode)
      .filter((p): p is Path2D => p !== null);
    pathCache.set(icon, cached);
  }
  return cached;
}
