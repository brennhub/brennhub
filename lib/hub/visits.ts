/**
 * Hub visit 통계 client helper.
 * POST = sessionStorage 1회 dedup. GET = count fetch.
 */

const SESSION_PREFIX = "brennhub-visit:";

export async function trackVisit(slug: string): Promise<void> {
  if (typeof window === "undefined") return;
  const key = `${SESSION_PREFIX}${slug}`;
  try {
    if (sessionStorage.getItem(key)) return; // already tracked this session
    sessionStorage.setItem(key, "1");
  } catch {
    // sessionStorage 차단 환경 — 그래도 POST 진행
  }
  try {
    await fetch(`/api/tools/${encodeURIComponent(slug)}/visit`, {
      method: "POST",
      credentials: "same-origin",
    });
  } catch {
    // 네트워크 실패 — silent
  }
}

export async function fetchVisitCount(
  slug: string,
  range: 7 | 30 | "all" = 30,
): Promise<number | null> {
  try {
    const res = await fetch(
      `/api/tools/${encodeURIComponent(slug)}/visit?range=${range}`,
      { method: "GET", credentials: "same-origin" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { count: number };
    return body.count;
  } catch {
    return null;
  }
}
