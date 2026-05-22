import {
  FOG_RADIUS,
  SCHEMA_VERSION,
  SIZES,
  type MazeProject,
  type MazeSize,
  type MazeTheme,
  type TileType,
} from "./types";
import { isValidGrid, newMazeId, newProject } from "./grid";

const KEY = "brennhub-maze";

/**
 * 알 수 없는/상위 스키마는 안전 폐기 (language-maker migrate 패턴).
 * V1이 첫 스키마라 마이그레이션 분기는 아직 없음 — 버전 불일치 = 폐기.
 */
function migrate(raw: unknown): MazeProject {
  if (!raw || typeof raw !== "object") return newProject();
  const d = raw as Partial<MazeProject> & { schemaVersion?: unknown };

  const version = typeof d.schemaVersion === "number" ? d.schemaVersion : 0;
  if (version !== SCHEMA_VERSION) return newProject();

  // size — 3종 중 하나가 아니면 전체 폐기 (grid 검증 기준이 무너짐).
  if (
    typeof d.size !== "number" ||
    !SIZES.includes(d.size as MazeSize)
  ) {
    return newProject();
  }
  const size = d.size as MazeSize;

  // grid — 빈 배열(설정 단계) 또는 정확한 size×size 정수 격자만 허용.
  const grid: TileType[][] =
    Array.isArray(d.grid) && d.grid.length === 0
      ? []
      : isValidGrid(d.grid, size)
        ? d.grid
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
    size,
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
