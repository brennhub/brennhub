import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  DIM_MAX,
  DIM_MIN,
  FOG_RADIUS,
  SCHEMA_VERSION,
  type MazeProject,
  type MazeTheme,
  type TileType,
} from "./types";
import { isValidGrid, newMazeId, newProject } from "./grid";

const KEY = "brennhub-maze";

function isValidDim(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= DIM_MIN && n <= DIM_MAX;
}

/**
 * 알 수 없는/상위 스키마는 안전 폐기 (language-maker migrate 패턴).
 *
 * Schema versions:
 *   v1 (P1~0.9.x): `size: 16|32|64` 정사각
 *   v2 (0.10.0+): `width`/`height: number` 분리 (DIM_MIN..DIM_MAX)
 *
 * v1 → v2: width=height=size로 변환. grid는 이미 size×size = width×height라 데이터
 * 변환 없음 — 메타데이터만. `size` 필드는 destructure로 명시 제거(스프레드는
 * inferred raw property를 통과시켜 v2 객체에 stale `size`가 잔류).
 */
function migrate(raw: unknown): MazeProject {
  if (!raw || typeof raw !== "object") return newProject();
  const d = raw as Record<string, unknown>;

  const version = typeof d.schemaVersion === "number" ? d.schemaVersion : 0;

  if (version === 1) {
    // v1 → v2: size를 명시 destructure로 빼고 width/height 부여.
    const { size, ...rest } = d as { size?: unknown } & Record<string, unknown>;
    if (typeof size !== "number" || !Number.isInteger(size)) return newProject();
    // size가 v2 DIM 범위 밖이면 폐기 (이론상 16/32/64는 다 안 — 방어).
    if (size < DIM_MIN || size > DIM_MAX) return newProject();
    return migrate({
      ...rest,
      schemaVersion: SCHEMA_VERSION,
      width: size,
      height: size,
    });
  }

  if (version !== SCHEMA_VERSION) return newProject();

  if (!isValidDim(d.width) || !isValidDim(d.height)) return newProject();
  const width = d.width as number;
  const height = d.height as number;

  // grid — 빈 배열(설정 단계) 또는 정확한 height×width 정수 격자만 허용.
  const grid: TileType[][] =
    Array.isArray(d.grid) && d.grid.length === 0
      ? []
      : isValidGrid(d.grid, width, height)
        ? (d.grid as TileType[][])
        : [];

  const fogRadius =
    typeof d.fogRadius === "number" &&
    d.fogRadius >= FOG_RADIUS.MIN &&
    d.fogRadius <= FOG_RADIUS.MAX
      ? Math.round(d.fogRadius)
      : FOG_RADIUS.DEFAULT;

  const theme: MazeTheme =
    d.theme === "sprite-dungeon" ? "sprite-dungeon" : "default";

  return {
    id: typeof d.id === "string" && d.id.length > 0 ? d.id : newMazeId(),
    schemaVersion: SCHEMA_VERSION,
    width: width || DEFAULT_WIDTH,
    height: height || DEFAULT_HEIGHT,
    fogOfWar: d.fogOfWar === true,
    fogRadius,
    theme,
    grid,
  };
}

/** localStorage에서 미로 프로젝트를 읽어 온다 (hydrate). */
export function loadProject(): MazeProject {
  if (typeof window === "undefined") return newProject();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newProject();
    return migrate(JSON.parse(raw));
  } catch {
    return newProject();
  }
}

/** 미로 프로젝트를 localStorage에 저장한다 (persist). */
export function saveProject(project: MazeProject): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    // quota 초과/불가 — 세션 내 상태는 그대로 유지
  }
}
