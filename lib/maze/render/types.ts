import type { TileType } from "../types";

export type RenderRect = {
  x: number;
  y: number;
  size: number;
};

export type ThemePalette = {
  /** empty 셀 + 캔버스 배경. */
  bg: string;
  /** 벽 단색 fill. */
  wallInk: string;
  /** 시작점 셀 틴트 (alpha 권장 — bg 블렌딩으로 양 테마 자연). */
  startTint: string;
  /** 시작점 아이콘 stroke. */
  startIcon: string;
  /** 도착점 셀 틴트. */
  goalTint: string;
  /** 도착점 아이콘 stroke. */
  goalIcon: string;
  /** 격자선. */
  gridLine: string;
  /** 플레이어 셀 틴트 (P3b 플레이 모드). */
  playerTint: string;
  /** 플레이어 아이콘 stroke (P3b 플레이 모드). */
  playerIcon: string;
  /** 길 마크 transient 오버레이 (P3c-2). */
  pathMarkTint: string;
};

export type TileRenderer = (
  ctx: CanvasRenderingContext2D,
  tile: TileType,
  palette: ThemePalette,
  rect: RenderRect,
) => void;

/**
 * 단일 테마의 렌더 엔진.
 *
 * grid 코드는 fillRect/stroke를 직접 호출하지 않고 엔진 메서드만 사용한다.
 * V2 'sprite-dungeon' 같은 새 테마는 같은 shape의 새 엔진을 만들고
 * `selectEngine` 분기를 추가하는 것으로 충분 — maze-grid 변경 0
 * (단, 비동기 에셋이 필요하면 아래 `ready?` 훅을 활용).
 *
 * **규약** — 엔진 구현은 `ctx.setTransform`을 호출하지 말 것.
 * 외부에서 설정한 DPR 변환을 보존하기 위해 save/translate/scale/restore로만
 * 로컬 변환을 둔다.
 */
export type RenderEngine = {
  palette: ThemePalette;

  /** 한 프레임 시작 — 캔버스 전체를 bg로 채운다. */
  clearBackground: (ctx: CanvasRenderingContext2D, displayPx: number) => void;

  /** 단일 셀 렌더. EMPTY는 no-op 가능 (배경이 처리). */
  renderTile: TileRenderer;

  /**
   * 플레이어 마커 렌더 (P3b 플레이 모드).
   *
   * 시작점 마커 위에 덧그리는 별도 layer — START 셀은 그대로 두고 플레이어
   * 위치에 추가로 그린다. 새 엔진(V2 sprite-dungeon 등)을 추가할 때 이 메서드
   * 구현이 필수 — 인터페이스 확장이라 silent oversell 방지.
   */
  renderPlayer: (
    ctx: CanvasRenderingContext2D,
    palette: ThemePalette,
    rect: RenderRect,
  ) => void;

  /**
   * 길 마크 오버레이 렌더 (P3c-2 옵셔널) — 셀 위에 반투명 색 덧칠.
   *
   * 마크는 `MazeProject.grid` 밖의 transient 레이어. "벽 생성" 커밋 시 grid에
   * 반영되어 사라진다. 미정의 시 maze-grid가 호출 자체를 skip — 호출자 책임.
   * V2 sprite-dungeon 엔진은 자기 마크 스타일을 따로 구현해 적용.
   */
  renderPathMark?: (
    ctx: CanvasRenderingContext2D,
    palette: ThemePalette,
    rect: RenderRect,
  ) => void;

  /** 격자선 stroke. */
  drawGridLines: (
    ctx: CanvasRenderingContext2D,
    displayPx: number,
    size: number,
  ) => void;

  /**
   * 선택적 비동기 에셋 로드 훅.
   *
   * 정의되면 maze-grid가 첫 프레임 전에 await — 호출자에 cancel 가드 책임.
   * V1 default 엔진은 미정의(동기). V2 sprite-dungeon은 스프라이트 시트
   * preload에 사용 예정.
   */
  ready?: () => Promise<void>;
};
