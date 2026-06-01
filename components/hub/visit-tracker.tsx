"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toolSlugFromPath } from "@/lib/tools/slug-from-path";
import { trackVisit } from "@/lib/hub/visits";

/**
 * 글로벌 layout 마운트. 도구 페이지 진입 시 1회 visit POST (sessionStorage dedup).
 * 도구 외 경로 (/, /admin, /releases 등)는 noop.
 */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    const slug = toolSlugFromPath(pathname);
    if (slug) {
      trackVisit(slug);
    }
  }, [pathname]);
  return null;
}
