/**
 * Lucide 아이콘 iconNode — 캔버스 Path2D 렌더용.
 *
 * Source: lucide-react v1.14.0 — ISC License.
 * https://github.com/lucide-icons/lucide
 * Copyright (c) Lucide Contributors.
 *
 * iconNode 구조(라이브러리 원본 형식)를 그대로 보존 — 근사·재구성 없음.
 * lucide 측 정의가 갱신되면 여기도 같은 형식으로 동기화한다.
 *
 * 추출 출처: node_modules/lucide-react/dist/esm/icons/{user,flag}.mjs
 */

export type IconAttrs = Record<string, string | number>;
export type IconNode = ReadonlyArray<readonly [string, IconAttrs]>;

/** lucide-react v1.14.0 — icons/user.mjs */
export const ICON_USER: IconNode = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: 12, cy: 7, r: 4 }],
];

/** lucide-react v1.14.0 — icons/flag.mjs (폴+깃발 단일 path) */
export const ICON_FLAG: IconNode = [
  [
    "path",
    {
      d: "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528",
    },
  ],
];

/** lucide iconNode 원소 1개를 Path2D로 변환. path/circle/line/rect 지원. */
export function pathFromNode(
  node: readonly [string, IconAttrs],
): Path2D | null {
  const [el, attrs] = node;
  switch (el) {
    case "path":
      return new Path2D(String(attrs.d ?? ""));
    case "circle": {
      const p = new Path2D();
      p.arc(
        Number(attrs.cx),
        Number(attrs.cy),
        Number(attrs.r),
        0,
        Math.PI * 2,
      );
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
      // 미지원 원소(향후 lucide가 새 SVG 원소를 도입할 경우)는 조용히 무시.
      return null;
  }
}

/**
 * IconNode → Path2D[] 캐시. Path2D는 브라우저 API라 모듈 로드 시점이 아닌
 * 첫 사용 시점에 생성하고, 동일 아이콘은 매 프레임 재생성하지 않는다.
 * WeakMap 키는 IconNode 배열 (모듈 export 안정 참조).
 */
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
