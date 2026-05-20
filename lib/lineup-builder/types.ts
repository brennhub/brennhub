export type Role = "GK" | "DF" | "MF" | "FW";

// 세부 포지션 15종. Role(4종)은 색·그룹용으로 그대로 유지 — Position과 공존.
export type PositionCode =
  | "GK"
  | "CB"
  | "LB"
  | "RB"
  | "LWB"
  | "RWB"
  | "DM"
  | "CM"
  | "AM"
  | "LM"
  | "RM"
  | "CF"
  | "SS"
  | "LW"
  | "RW";

// 편집 모달 select 옵션 순서.
export const POSITION_CODES: PositionCode[] = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "CF",
  "SS",
  "LW",
  "RW",
];

export type FormationId =
  | "4-4-2"
  | "4-3-3"
  | "3-5-2"
  | "4-2-3-1"
  | "4-1-4-1"
  | "3-4-3"
  | "5-3-2"
  | "4-3-2-1";

export type Player = {
  id: number; // 1-11
  role: Role;
  position: PositionCode;
  top: number; // % from top of pitch (0 = 상대 골대, 100 = 우리 GK)
  left: number; // % from left of pitch (0 = 왼쪽, 100 = 오른쪽)
  name: string;
  number: number;
};

export type Formation = {
  id: FormationId;
  players: Player[]; // 11명. 표시명은 i18n lineupBuilder.formations[id]
};
