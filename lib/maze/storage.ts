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
/**
 * 핵심 migrate — schema 폐기 시 null 반환.
 * `migrate`(loadProject용)와 `migrateSharedPayload`(P4 숏링크용) 둘이 공유.
 * 호출자가 폐기 fallback을 결정한다 (newProject vs not-found).
 */
function migrateOrNull(raw: unknown): MazeProject | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  const version = typeof d.schemaVersion === "number" ? d.schemaVersion : 0;

  if (version === 1) {
    // v1 → v2: size를 명시 destructure로 빼고 width/height 부여.
    const { size, ...rest } = d as { size?: unknown } & Record<string, unknown>;
    if (typeof size !== "number" || !Number.isInteger(size)) return null;
    if (size < DIM_MIN || size > DIM_MAX) return null;
    return migrateOrNull({
      ...rest,
      schemaVersion: 2,
      width: size,
      height: size,
    });
  }

  if (version === 2) {
    // v2 → v3: playViewSpan = 16 강제.
    return migrateOrNull({
      ...d,
      schemaVersion: SCHEMA_VERSION,
      playViewSpan: ZOOM_REFERENCE_SIZE,
    });
  }

  if (version !== SCHEMA_VERSION) return null;

  if (!isValidDim(d.width) || !isValidDim(d.height)) return null;
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

/** loadProject용 wrap — 폐기 시 새 프로젝트 fallback. */
function migrate(raw: unknown): MazeProject {
  return migrateOrNull(raw) ?? newProject();
}

/**
 * P4 숏링크 공유용 — 폐기 시 null 반환 (호출자가 not-found fallback).
 *
 * sharedProject도 localStorage 드래프트와 같은 migrate 경로를 타야 — 숏링크는
 * "영구 스냅샷"이고 향후 schema bump 때 구 숏링크가 안 깨지려면 필수.
 * 추가로 grid 빈 배열은 공유 미로로 부적절 (validation.ok 게이팅 통과 못 함) — null.
 *
 * page.tsx 등 server component에서 호출 가능 (순수 함수, side-effect 0).
 */
export function migrateSharedPayload(raw: unknown): MazeProject | null {
  const result = migrateOrNull(raw);
  if (!result) return null;
  if (result.grid.length === 0) return null;
  return result;
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
