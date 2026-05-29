import type { MazeTheme } from "../types";
import { createDefaultEngine } from "./default";
import type { RenderEngine } from "./types";

export type { IconNode } from "./icons";
export type {
  RenderEngine,
  RenderRect,
  ThemePalette,
  TileRenderer,
} from "./types";

/**
 * 현재 MazeTheme에 맞는 RenderEngine을 반환한다.
 *
 * V1은 default만 구현. V2 'sprite-dungeon' 추가 시:
 *   1) `lib/maze/render/sprite-dungeon.ts` 작성 (`createSpriteDungeonEngine`).
 *   2) 아래 분기에 한 줄 추가.
 *   3) sprite 엔진은 비동기 스프라이트 시트 로드를 `ready()`로 노출.
 * maze-grid 코드는 변경 없음 — `await engine.ready?.()`를 이미 처리.
 */
export function selectEngine(
  theme: MazeTheme,
  dark: boolean,
): RenderEngine {
  if (theme === "sprite-dungeon") {
    // V2 미구현 — default로 폴백 (V1에서는 도달 불가, MazeProject.theme는
    // 항상 "default").
    return createDefaultEngine(dark);
  }
  return createDefaultEngine(dark);
}
