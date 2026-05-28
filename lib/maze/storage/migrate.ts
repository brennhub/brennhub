import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  DIM_MAX,
  DIM_MIN,
  FOG_RADIUS,
  SCHEMA_VERSION,
  TIME_LIMIT,
  type MazeProject,
  type MazeTheme,
  type TileType,
} from "../types";
import { ZOOM_REFERENCE_SIZE } from "../viewport";
import { isValidGrid, newMazeId } from "../grid";

function isValidDim(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= DIM_MIN && n <= DIM_MAX;
}

/**
 * 알 수 없는/상위 스키마는 안전 폐기 (language-maker migrate 패턴).
 *
 * Schema versions:
 *   v1 (P1~0.9.x): `size: 16|32|64` 정사각
 *   v2 (0.10.0~0.11.0): `width`/`height: number` 분리 (DIM_MIN..DIM_MAX)
 *   v3 (0.12.0~1.0.x): `playViewSpan: number` 추가 — 플레이 시야 거리
 *   v4 (1.1.0+): `timeLimitSec: number | null` 추가 — 제한 시간 (null=타이머 없음)
 *
 * v1 → v2: width=height=size로 변환. `size` destructure 명시 제거.
 * v2 → v3: `playViewSpan = 16` 강제 (구 프로젝트 기본 = 가장 가까이).
 * v3 → v4: `timeLimitSec = null` (기존 미로는 타이머 없음).
 *
 * ⚠️ localStorage(게스트) 경로 전용. D1(로그인) 경로는 migrate 안 함 — 현 schema만 보유.
 * 핵심 migrate — schema 폐기 시 null 반환. 호출자가 폐기 fallback 결정.
 */
export function migrateOrNull(raw: unknown): MazeProject | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;

  const version = typeof d.schemaVersion === "number" ? d.schemaVersion : 0;

  if (version === 1) {
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
    return migrateOrNull({
      ...d,
      schemaVersion: 3,
      playViewSpan: ZOOM_REFERENCE_SIZE,
    });
  }

  if (version === 3) {
    return migrateOrNull({
      ...d,
      schemaVersion: SCHEMA_VERSION,
      timeLimitSec: null,
    });
  }

  if (version !== SCHEMA_VERSION) return null;

  if (!isValidDim(d.width) || !isValidDim(d.height)) return null;
  const width = d.width as number;
  const height = d.height as number;

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

  const maxSpan = Math.max(width, height);
  const rawSpan =
    typeof d.playViewSpan === "number" && Number.isInteger(d.playViewSpan)
      ? d.playViewSpan
      : ZOOM_REFERENCE_SIZE;
  const playViewSpan = Math.min(
    Math.max(rawSpan, ZOOM_REFERENCE_SIZE),
    Math.max(maxSpan, ZOOM_REFERENCE_SIZE),
  );

  const timeLimitSec: number | null =
    d.timeLimitSec === null
      ? null
      : typeof d.timeLimitSec === "number" &&
          Number.isInteger(d.timeLimitSec) &&
          d.timeLimitSec >= TIME_LIMIT.MIN &&
          d.timeLimitSec <= TIME_LIMIT.MAX
        ? d.timeLimitSec
        : null;

  return {
    id: typeof d.id === "string" && d.id.length > 0 ? d.id : newMazeId(),
    schemaVersion: SCHEMA_VERSION,
    width: width || DEFAULT_WIDTH,
    height: height || DEFAULT_HEIGHT,
    fogOfWar: d.fogOfWar === true,
    fogRadius,
    theme,
    playViewSpan,
    timeLimitSec,
    grid,
  };
}

/**
 * P4 숏링크 공유용 — 폐기 시 null 반환 (호출자가 not-found fallback).
 *
 * sharedProject도 localStorage 드래프트와 같은 migrate 경로를 타야 — 숏링크는
 * "영구 스냅샷"이고 향후 schema bump 때 구 숏링크가 안 깨지려면 필수.
 * grid 빈 배열은 공유 미로로 부적절 — null.
 *
 * page.tsx 등 server component에서 호출 가능 (순수 함수, side-effect 0).
 */
export function migrateSharedPayload(raw: unknown): MazeProject | null {
  const result = migrateOrNull(raw);
  if (!result) return null;
  if (result.grid.length === 0) return null;
  return result;
}
