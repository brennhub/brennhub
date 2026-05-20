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
// top 값은 round((top-50)*0.85+50)로 균등 압축됨 (위아래 마진 확보, GK 잘림 해소).
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
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "LB", 71, 15),
      mkPlayer(3, "DF", "CB", 71, 38),
      mkPlayer(4, "DF", "CB", 71, 62),
      mkPlayer(5, "DF", "RB", 71, 85),
      mkPlayer(6, "MF", "LM", 50, 15),
      mkPlayer(7, "MF", "CM", 50, 38),
      mkPlayer(8, "MF", "CM", 50, 62),
      mkPlayer(9, "MF", "RM", 50, 85),
      mkPlayer(10, "FW", "CF", 26, 38),
      mkPlayer(11, "FW", "CF", 26, 62),
    ],
  },
  {
    id: "4-3-3",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "LB", 71, 15),
      mkPlayer(3, "DF", "CB", 71, 38),
      mkPlayer(4, "DF", "CB", 71, 62),
      mkPlayer(5, "DF", "RB", 71, 85),
      mkPlayer(6, "MF", "CM", 52, 28),
      mkPlayer(7, "MF", "CM", 52, 50),
      mkPlayer(8, "MF", "CM", 52, 72),
      mkPlayer(9, "FW", "LW", 26, 18),
      mkPlayer(10, "FW", "CF", 26, 50),
      mkPlayer(11, "FW", "RW", 26, 82),
    ],
  },
  {
    id: "3-5-2",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "CB", 71, 25),
      mkPlayer(3, "DF", "CB", 71, 50),
      mkPlayer(4, "DF", "CB", 71, 75),
      mkPlayer(5, "MF", "LWB", 52, 10),
      mkPlayer(6, "MF", "CM", 48, 30),
      mkPlayer(7, "MF", "CM", 48, 50),
      mkPlayer(8, "MF", "CM", 48, 70),
      mkPlayer(9, "MF", "RWB", 52, 90),
      mkPlayer(10, "FW", "CF", 26, 38),
      mkPlayer(11, "FW", "CF", 26, 62),
    ],
  },
  {
    id: "4-2-3-1",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "LB", 71, 15),
      mkPlayer(3, "DF", "CB", 71, 38),
      mkPlayer(4, "DF", "CB", 71, 62),
      mkPlayer(5, "DF", "RB", 71, 85),
      mkPlayer(6, "MF", "DM", 57, 35),
      mkPlayer(7, "MF", "DM", 57, 65),
      mkPlayer(8, "MF", "LW", 40, 25),
      mkPlayer(9, "MF", "AM", 40, 50),
      mkPlayer(10, "MF", "RW", 40, 75),
      mkPlayer(11, "FW", "CF", 23, 50),
    ],
  },
  {
    id: "4-1-4-1",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "LB", 71, 15),
      mkPlayer(3, "DF", "CB", 71, 38),
      mkPlayer(4, "DF", "CB", 71, 62),
      mkPlayer(5, "DF", "RB", 71, 85),
      mkPlayer(6, "MF", "DM", 59, 50),
      mkPlayer(7, "MF", "LM", 43, 15),
      mkPlayer(8, "MF", "CM", 43, 38),
      mkPlayer(9, "MF", "CM", 43, 62),
      mkPlayer(10, "MF", "RM", 43, 85),
      mkPlayer(11, "FW", "CF", 23, 50),
    ],
  },
  {
    id: "3-4-3",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "CB", 71, 25),
      mkPlayer(3, "DF", "CB", 71, 50),
      mkPlayer(4, "DF", "CB", 71, 75),
      mkPlayer(5, "MF", "LWB", 50, 10),
      mkPlayer(6, "MF", "CM", 48, 35),
      mkPlayer(7, "MF", "CM", 48, 65),
      mkPlayer(8, "MF", "RWB", 50, 90),
      mkPlayer(9, "FW", "LW", 26, 20),
      mkPlayer(10, "FW", "CF", 26, 50),
      mkPlayer(11, "FW", "RW", 26, 80),
    ],
  },
  {
    id: "5-3-2",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "LWB", 67, 12),
      mkPlayer(3, "DF", "CB", 71, 32),
      mkPlayer(4, "DF", "CB", 71, 50),
      mkPlayer(5, "DF", "CB", 71, 68),
      mkPlayer(6, "DF", "RWB", 67, 88),
      mkPlayer(7, "MF", "CM", 50, 28),
      mkPlayer(8, "MF", "CM", 50, 50),
      mkPlayer(9, "MF", "CM", 50, 72),
      mkPlayer(10, "FW", "CF", 26, 38),
      mkPlayer(11, "FW", "CF", 26, 62),
    ],
  },
  {
    id: "4-3-2-1",
    players: [
      mkPlayer(1, "GK", "GK", 86, 50),
      mkPlayer(2, "DF", "LB", 71, 15),
      mkPlayer(3, "DF", "CB", 71, 38),
      mkPlayer(4, "DF", "CB", 71, 62),
      mkPlayer(5, "DF", "RB", 71, 85),
      mkPlayer(6, "MF", "CM", 54, 25),
      mkPlayer(7, "MF", "CM", 54, 50),
      mkPlayer(8, "MF", "CM", 54, 75),
      mkPlayer(9, "MF", "AM", 37, 35),
      mkPlayer(10, "MF", "AM", 37, 65),
      mkPlayer(11, "FW", "CF", 20, 50),
    ],
  },
];

export const DEFAULT_FORMATION_ID: FormationId = "4-3-3";

export function getFormation(id: FormationId): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[1];
}
