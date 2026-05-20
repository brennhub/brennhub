import type { Formation, FormationId, Player, Role } from "./types";

// 좌표계: top% 0=상대 골대(위) / 100=우리 GK(아래), left% 0=왼쪽 / 100=오른쪽.
// name 기본값 "선수 N", number 기본값 N — 사용자가 인라인 편집(Task B)으로 덮어씀.
function mkPlayer(id: number, role: Role, top: number, left: number): Player {
  return { id, role, top, left, name: `선수 ${id}`, number: id };
}

export const FORMATIONS: Formation[] = [
  {
    id: "4-4-2",
    players: [
      mkPlayer(1, "GK", 92, 50),
      mkPlayer(2, "DF", 75, 15),
      mkPlayer(3, "DF", 75, 38),
      mkPlayer(4, "DF", 75, 62),
      mkPlayer(5, "DF", 75, 85),
      mkPlayer(6, "MF", 50, 15),
      mkPlayer(7, "MF", 50, 38),
      mkPlayer(8, "MF", 50, 62),
      mkPlayer(9, "MF", 50, 85),
      mkPlayer(10, "FW", 22, 38),
      mkPlayer(11, "FW", 22, 62),
    ],
  },
  {
    id: "4-3-3",
    players: [
      mkPlayer(1, "GK", 92, 50),
      mkPlayer(2, "DF", 75, 15),
      mkPlayer(3, "DF", 75, 38),
      mkPlayer(4, "DF", 75, 62),
      mkPlayer(5, "DF", 75, 85),
      mkPlayer(6, "MF", 52, 28),
      mkPlayer(7, "MF", 52, 50),
      mkPlayer(8, "MF", 52, 72),
      mkPlayer(9, "FW", 22, 18),
      mkPlayer(10, "FW", 22, 50),
      mkPlayer(11, "FW", 22, 82),
    ],
  },
  {
    id: "3-5-2",
    players: [
      mkPlayer(1, "GK", 92, 50),
      mkPlayer(2, "DF", 75, 25),
      mkPlayer(3, "DF", 75, 50),
      mkPlayer(4, "DF", 75, 75),
      mkPlayer(5, "MF", 52, 10), // 좌측 윙백
      mkPlayer(6, "MF", 48, 30),
      mkPlayer(7, "MF", 48, 50),
      mkPlayer(8, "MF", 48, 70),
      mkPlayer(9, "MF", 52, 90), // 우측 윙백
      mkPlayer(10, "FW", 22, 38),
      mkPlayer(11, "FW", 22, 62),
    ],
  },
  {
    id: "4-2-3-1",
    players: [
      mkPlayer(1, "GK", 92, 50),
      mkPlayer(2, "DF", 75, 15),
      mkPlayer(3, "DF", 75, 38),
      mkPlayer(4, "DF", 75, 62),
      mkPlayer(5, "DF", 75, 85),
      mkPlayer(6, "MF", 58, 35), // CDM
      mkPlayer(7, "MF", 58, 65), // CDM
      mkPlayer(8, "MF", 38, 25), // CAM
      mkPlayer(9, "MF", 38, 50), // CAM
      mkPlayer(10, "MF", 38, 75), // CAM
      mkPlayer(11, "FW", 18, 50),
    ],
  },
];

export const DEFAULT_FORMATION_ID: FormationId = "4-3-3";

export function getFormation(id: FormationId): Formation {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[1];
}
