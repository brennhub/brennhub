export type Role = "GK" | "DF" | "MF" | "FW";

export type FormationId = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1";

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
  label: string;
  players: Player[]; // 11명
};
