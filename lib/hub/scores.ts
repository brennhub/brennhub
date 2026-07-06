/**
 * 게임 랭킹 client helper. fetch wrapper — API가 진실. null/false-on-error (likes.ts 관례).
 */

export type ScoreEntry = { name: string; score: number; created_at: number };

export async function fetchScores(slug: string): Promise<ScoreEntry[] | null> {
  try {
    const res = await fetch(`/api/tools/${encodeURIComponent(slug)}/score`, {
      method: "GET",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { scores?: ScoreEntry[] };
    return data.scores ?? [];
  } catch {
    return null;
  }
}

export async function submitScore(slug: string, name: string, score: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/tools/${encodeURIComponent(slug)}/score`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
