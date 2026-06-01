/**
 * pathname → 도구 slug 매핑 (`/tools/<slug>` 또는 `/naming` 별칭).
 * registry에 등록된 도구만 반환. 그 외 경로/미등록 슬러그 = null.
 * FeedbackButton과 ToolFavoriteButton에서 공통 사용.
 */

import { tools } from "@/lib/tools-registry";

const SLUG_SET = new Set(tools.map((tool) => tool.slug));

export function toolSlugFromPath(
  pathname: string | null | undefined,
): string | null {
  if (!pathname) return null;
  // `/naming` 은 saju-naming 별칭 경로
  if (pathname === "/naming" || pathname.startsWith("/naming/")) {
    return SLUG_SET.has("saju-naming") ? "saju-naming" : null;
  }
  const match = pathname.match(/^\/tools\/([^/]+)/);
  if (!match) return null;
  const slug = match[1];
  return SLUG_SET.has(slug) ? slug : null;
}
