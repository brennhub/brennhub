import type { ScoreStorage } from "./types";

const KEY = "brennhub-shooter-highscore";

export class LocalScoreStorage implements ScoreStorage {
  async getHighScore(): Promise<number> {
    if (typeof window === "undefined") return 0;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return 0;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    } catch {
      return 0;
    }
  }

  async saveScore(score: number): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      const current = await this.getHighScore();
      if (score > current) {
        localStorage.setItem(KEY, String(Math.floor(score)));
      }
    } catch {
      // quota / 접근 차단 — silent.
    }
  }
}

export const scoreStorage: ScoreStorage = new LocalScoreStorage();
