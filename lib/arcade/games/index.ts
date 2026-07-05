/**
 * Arcade 게임 레지스트리.
 *
 * 각 게임 모듈을 import 하면 side-effect로 Engine.defineGame(...) 이 실행돼 등록된다.
 * 게임 2~6 추가 시: 아래 import 한 줄 + ARCADE_GAMES 목록 한 줄만 더한다 (엔진/shell 불변).
 */
import "./beacon";
// batch 12+: import "./flail"; import "./circ"; import "./repel"; import "./lure"; import "./sing";

export type ArcadeGameMeta = { id: string; label: string };

/** selector UI 표시 목록(순서 = 표시 순서). 활성 게임 tick은 Engine이 담당. */
export const ARCADE_GAMES: ArcadeGameMeta[] = [{ id: "beacon", label: "Beacon" }];
