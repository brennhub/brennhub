/**
 * 도구별 metadata 헬퍼. tools-registry × messages.ts ko 데이터로 생성.
 * 페이지 measure 1줄: `export const metadata = toolMetadata("stock-sim")`.
 * client component인 도구는 route-segment `layout.tsx` (server)에서 export.
 */

import type { Metadata } from "next";
import { messages } from "@/lib/i18n/messages";
import { SITE_NAME, SITE_URL } from "./site";

export function toolMetadata(slug: string): Metadata {
  const t = messages.ko.tools[slug];
  if (!t) return {};
  const url = `${SITE_URL}/tools/${slug}`;
  return {
    title: t.name,
    description: t.description,
    alternates: { canonical: url },
    openGraph: {
      title: t.name,
      description: t.description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "ko_KR",
    },
    twitter: {
      card: "summary",
      title: t.name,
      description: t.description,
    },
  };
}
