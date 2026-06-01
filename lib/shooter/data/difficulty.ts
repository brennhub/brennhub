import type { Difficulty } from "../types";

/**
 * 난이도 mod — spawn delay / enemy hp·speed / 초기 lives에 곱해진다.
 *
 * - easy:   초보자용 (HP 적음, 느림, spawn 천천히, lives 4)
 * - normal: 기본 (mod 1 — 데이터 정의값 그대로)
 * - hard:   숙련자용 (HP·속도 강화, spawn 빠름, lives 2)
 */
export type DifficultyMod = {
  hpMult: number;
  speedMult: number;
  /** delay × mod (큰 값일수록 spawn 천천히 → 더 쉬움). */
  delayMult: number;
  initialLives: number;
};

export const DIFFICULTY_MODS: Record<Difficulty, DifficultyMod> = {
  easy: { hpMult: 0.7, speedMult: 0.85, delayMult: 1.3, initialLives: 4 },
  normal: { hpMult: 1.0, speedMult: 1.0, delayMult: 1.0, initialLives: 3 },
  hard: { hpMult: 1.5, speedMult: 1.2, delayMult: 0.8, initialLives: 2 },
};

export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export const DEFAULT_DIFFICULTY: Difficulty = "normal";

/** localStorage 키 — 마지막 선택 영속. */
export const DIFFICULTY_STORAGE_KEY = "brennhub-shooter-difficulty";
