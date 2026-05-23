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
import { ZOOM_REFERENCE_SIZE } from "./viewport";
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
 *   v2 (0.10.0~0.11.0): `width`/`height: number` 분리 (DIM_MIN..DIM_MAX)
 *   v3 (0.12.0+): `playViewSpan: number` 추가 — 플레이 시야 거리 (캔버스 한 변 보이는 칸 수)
 *
 * v1 → v2: width=height=size로 변환. grid는 이미 size×size = width×height라 데이터
 * 변환 없음 — 메타데이터만. `size` 필드는 destructure로 명시 제거.
 * v2 → v3: `playViewSpan = 16` 강제 (사용자 명시 — 구 프로젝트 기본 = 가장 가까이).
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
      schemaVersion: 2,
      width: size,
      height: size,
    });
  }

  if (version === 2) {
    // v2 → v3: playViewSpan = 16 강제 (구 프로젝트 기본 = 가장 가까이).
    return migrate({
      ...d,
      schemaVersion: SCHEMA_VERSION,
      playViewSpan: ZOOM_REFERENCE_SIZE,
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

  // playViewSpan — [ZOOM_REFERENCE_SIZE, max(width, height)] 안으로 clamp.
  // 저장값이 손상되었거나 사이즈 변경 후 stale이면 안전 fallback.
  const maxSpan = Math.max(width, height);
  const rawSpan =
    typeof d.playViewSpan === "number" && Number.isInteger(d.playViewSpan)
      ? d.playViewSpan
      : ZOOM_REFERENCE_SIZE;
  const playViewSpan = Math.min(
    Math.max(rawSpan, ZOOM_REFERENCE_SIZE),
    Math.max(maxSpan, ZOOM_REFERENCE_SIZE),
  );

  return {
    id: typeof d.id === "string" && d.id.length > 0 ? d.id : newMazeId(),
    schemaVersion: SCHEMA_VERSION,
    width: width || DEFAULT_WIDTH,
    height: height || DEFAULT_HEIGHT,
    fogOfWar: d.fogOfWar === true,
    fogRadius,
    theme,
    playViewSpan,
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
