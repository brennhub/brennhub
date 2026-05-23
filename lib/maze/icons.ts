import { Flag, Square, User, type LucideIcon } from "lucide-react";

/**
 * 도구 팔레트 아이콘 매핑 — 시작/도착이 렌더러(lib/maze/render/icons.ts iconNode)와
 * 어긋나지 않도록 lucide-react에서 직접 import한 같은 v1.14.0 출처.
 *
 * 도구 팔레트 버튼(React 컴포넌트)과 렌더러(Path2D iconNode)는 출력 형식이 다르지만
 * 둘 다 lucide-react v1.14.0이 단일 출처라 시각 일관 자동.
 *
 * V2에서 시작 아이콘을 바꾸려면:
 *   1) 본 파일의 START 매핑 교체
 *   2) lib/maze/render/icons.ts의 ICON_USER iconNode를 같은 lucide 식별자로 교체
 * 두 곳을 함께 갱신해야 어긋나지 않음.
 */
export const MAZE_TOOL_ICONS = {
  WALL: Square,
  START: User,
  GOAL: Flag,
} as const satisfies Record<"WALL" | "START" | "GOAL", LucideIcon>;
