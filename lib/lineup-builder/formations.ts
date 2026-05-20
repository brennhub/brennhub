import type {
  Formation,
  FormationId,
  Player,
  PositionCode,
  Role,
} from "./types";

// 좌표계: top% 0=상대 골대(위) / 100=우리 GK(아래), left% 0=왼쪽 / 100=오른쪽.
// name 기본값 "선수 N", number 기본값 N — 사용자가 인라인 편집으로 덮어씀.
// role(4종)은 색·그룹용, position(15종)은 표시·편집용 — 둘 공존.
function mkPlayer(
  id: number,
  role: Role,
  position: PositionCode,
  top: number,
  left: number,
): Player {
  return { id, role, position, top, left, name: `선수 ${id}`, number: id };
}

export const FORMATIONS: Formation[] = [
  {
    id: "4-4-2",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "LB", 75, 15),
      mkPlayer(3, "DF", "CB", 75, 38),
      mkPlayer(4, "DF", "CB", 75, 62),
      mkPlayer(5, "DF", "RB", 75, 85),
      mkPlayer(6, "MF", "LM", 50, 15),
      mkPlayer(7, "MF", "CM", 50, 38),
      mkPlayer(8, "MF", "CM", 50, 62),
      mkPlayer(9, "MF", "RM", 50, 85),
      mkPlayer(10, "FW", "CF", 22, 38),
      mkPlayer(11, "FW", "CF", 22, 62),
    ],
  },
  {
    id: "4-3-3",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "LB", 75, 15),
      mkPlayer(3, "DF", "CB", 75, 38),
      mkPlayer(4, "DF", "CB", 75, 62),
      mkPlayer(5, "DF", "RB", 75, 85),
      mkPlayer(6, "MF", "CM", 52, 28),
      mkPlayer(7, "MF", "CM", 52, 50),
      mkPlayer(8, "MF", "CM", 52, 72),
      mkPlayer(9, "FW", "LW", 22, 18),
      mkPlayer(10, "FW", "CF", 22, 50),
      mkPlayer(11, "FW", "RW", 22, 82),
    ],
  },
  {
    id: "3-5-2",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "CB", 75, 25),
      mkPlayer(3, "DF", "CB", 75, 50),
      mkPlayer(4, "DF", "CB", 75, 75),
      mkPlayer(5, "MF", "LWB", 52, 10),
      mkPlayer(6, "MF", "CM", 48, 30),
      mkPlayer(7, "MF", "CM", 48, 50),
      mkPlayer(8, "MF", "CM", 48, 70),
      mkPlayer(9, "MF", "RWB", 52, 90),
      mkPlayer(10, "FW", "CF", 22, 38),
      mkPlayer(11, "FW", "CF", 22, 62),
    ],
  },
  {
    id: "4-2-3-1",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "LB", 75, 15),
      mkPlayer(3, "DF", "CB", 75, 38),
      mkPlayer(4, "DF", "CB", 75, 62),
      mkPlayer(5, "DF", "RB", 75, 85),
      mkPlayer(6, "MF", "DM", 58, 35),
      mkPlayer(7, "MF", "DM", 58, 65),
      mkPlayer(8, "MF", "LW", 38, 25),
      mkPlayer(9, "MF", "AM", 38, 50),
      mkPlayer(10, "MF", "RW", 38, 75),
      mkPlayer(11, "FW", "CF", 18, 50),
    ],
  },
  {
    id: "4-1-4-1",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "LB", 75, 15),
      mkPlayer(3, "DF", "CB", 75, 38),
      mkPlayer(4, "DF", "CB", 75, 62),
      mkPlayer(5, "DF", "RB", 75, 85),
      mkPlayer(6, "MF", "DM", 60, 50),
      mkPlayer(7, "MF", "LM", 42, 15),
      mkPlayer(8, "MF", "CM", 42, 38),
      mkPlayer(9, "MF", "CM", 42, 62),
      mkPlayer(10, "MF", "RM", 42, 85),
      mkPlayer(11, "FW", "CF", 18, 50),
    ],
  },
  {
    id: "3-4-3",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "CB", 75, 25),
      mkPlayer(3, "DF", "CB", 75, 50),
      mkPlayer(4, "DF", "CB", 75, 75),
      mkPlayer(5, "MF", "LWB", 50, 10),
      mkPlayer(6, "MF", "CM", 48, 35),
      mkPlayer(7, "MF", "CM", 48, 65),
      mkPlayer(8, "MF", "RWB", 50, 90),
      mkPlayer(9, "FW", "LW", 22, 20),
      mkPlayer(10, "FW", "CF", 22, 50),
      mkPlayer(11, "FW", "RW", 22, 80),
    ],
  },
  {
    id: "5-3-2",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "LWB", 70, 12),
      mkPlayer(3, "DF", "CB", 75, 32),
      mkPlayer(4, "DF", "CB", 75, 50),
      mkPlayer(5, "DF", "CB", 75, 68),
      mkPlayer(6, "DF", "RWB", 70, 88),
      mkPlayer(7, "MF", "CM", 50, 28),
      mkPlayer(8, "MF", "CM", 50, 50),
      mkPlayer(9, "MF", "CM", 50, 72),
      mkPlayer(10, "FW", "CF", 22, 38),
      mkPlayer(11, "FW", "CF", 22, 62),
    ],
  },
  {
    id: "4-3-2-1",
    players: [
      mkPlayer(1, "GK", "GK", 92, 50),
      mkPlayer(2, "DF", "LB", 75, 15),
      mkPlayer(3, "DF", "CB", 75, 38),
      mkPlayer(4, "DF", "CB", 75, 62),
      mkPlayer(5, "DF", "RB", 75, 85),
      mkPlayer(6, "MF", "CM", 55, 25),
      mkPlayer(7, "MF", "CM", 55, 50),
      mkPlayer(8, "MF", "CM", 55, 75),
      mkPlayer(9, "MF", "AM", 35, 35),
      mkPlayer(10, "MF", "AM", 35, 65),
      mkPlayer(11, "FW", "CF", 15, 50),
    ],
  },
];

export const DEFAULT_FORMATION_ID: FormationId = "4-3-3";

export function getFormation(id: FormationId): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[1];
}
