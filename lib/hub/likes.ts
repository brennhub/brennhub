/**
 * Hub 좋아요 client helper.
 * fetch wrapper — 도메인 로직 없음. API가 진실 (count + has_liked).
 */

export type LikeState = {
  count: number;
  liked: boolean;
};

export async function fetchLikes(slug: string): Promise<LikeState | null> {
  try {
    const res = await fetch(`/api/tools/${encodeURIComponent(slug)}/likes`, {
      method: "GET",
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    return (await res.json()) as LikeState;
  } catch {
    return null;
  }
}

export async function toggleLike(slug: string): Promise<LikeState | null> {
  try {
    const res = await fetch(`/api/tools/${encodeURIComponent(slug)}/likes`, {
      method: "PUT",
      credentials: "same-origin",
    });
    if (res.status === 401) {
      // 로그인 필요 — 호출 측에서 toast 처리.
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as LikeState;
  } catch {
    return null;
  }
}
