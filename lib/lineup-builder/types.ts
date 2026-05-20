export type Role = "GK" | "DF" | "MF" | "FW";

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
  top: number; // % from top of pitch (0 = 상대 골대, 100 = 우리 GK)
  left: number; // % from left of pitch (0 = 왼쪽, 100 = 오른쪽)
  name: string;
  number: number;
};

export type Formation = {
  id: FormationId;
  players: Player[]; // 11명. 표시명은 i18n lineupBuilder.formations[id]
};
