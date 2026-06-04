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
 * 추출 출처: node_modules/lucide-react/dist/esm/icons/{ghost,bug,shield,zap,sparkles,coins,heart}.mjs
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

/** lucide-react v1.14.0 — icons/shield.mjs */
const ICON_SHIELD: IconNode = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    },
  ],
];

/** lucide-react v1.14.0 — icons/zap.mjs */
const ICON_ZAP: IconNode = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
    },
  ],
];

/** lucide-react v1.14.0 — icons/sparkles.mjs */
const ICON_SPARKLES: IconNode = [
  [
    "path",
    {
      d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
    },
  ],
  ["path", { d: "M20 2v4" }],
  ["path", { d: "M22 4h-4" }],
  ["circle", { cx: 4, cy: 20, r: 2 }],
];

/** lucide-react v1.14.0 — icons/coins.mjs */
const ICON_COINS: IconNode = [
  ["path", { d: "M13.744 17.736a6 6 0 1 1-7.48-7.48" }],
  ["path", { d: "M15 6h1v4" }],
  ["path", { d: "m6.134 14.768.866-.5 2 3.464" }],
  ["circle", { cx: 16, cy: 8, r: 6 }],
];

/** lucide-react v1.14.0 — icons/heart.mjs */
const ICON_HEART: IconNode = [
  [
    "path",
    {
      d: "M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",
    },
  ],
];

export const ICON_NODES: Record<LucideIconId, IconNode> = {
  ghost: ICON_GHOST,
  bug: ICON_BUG,
  shield: ICON_SHIELD,
  zap: ICON_ZAP,
  sparkles: ICON_SPARKLES,
  coins: ICON_COINS,
  heart: ICON_HEART,
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
