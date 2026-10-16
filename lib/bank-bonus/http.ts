/**
 * bank-bonus 공용 fetch — Worker에서 캐시 없이 원본 페이지를 받는다.
 * probe(/api/admin/bank-bonus/probe)와 fetch 엔진(engine.ts)이 같이 쓴다.
 */

export const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export const BLOCK_MARKERS = ["captcha", "Just a moment", "Access Denied", "cf-chl"];

export type FetchResult = {
  status: number;
  finalUrl: string;
  contentType: string;
  body: string;
  elapsedMs: number;
  lastModified: string | null;
  age: string | null;
  cfCacheStatus: string | null;
};

export async function fetchFresh(url: string): Promise<FetchResult> {
  const started = Date.now();
  const res = await fetch(url, {
    redirect: "follow",
    cache: "no-store",
    headers: {
      "User-Agent": DESKTOP_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  const body = await res.text();
  return {
    status: res.status,
    finalUrl: res.url,
    contentType: res.headers.get("content-type") ?? "",
    body,
    elapsedMs: Date.now() - started,
    lastModified: res.headers.get("last-modified"),
    age: res.headers.get("age"),
    cfCacheStatus: res.headers.get("cf-cache-status"),
  };
}

/** 본문에 들어 있는 차단 페이지 표지. "captcha"는 정상 페이지에도 있을 수 있어 참고용. */
export function blockMarkersIn(body: string): string[] {
  return BLOCK_MARKERS.filter((m) => body.includes(m));
}
