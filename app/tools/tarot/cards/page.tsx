import type { Metadata } from "next";
import { messages } from "@/lib/i18n/messages";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CardsDictionaryShell } from "./cards-shell";

const title = `${messages.ko.tarot.dictTitle} — ${messages.ko.tools.tarot.name}`;
const description = messages.ko.tarot.dictIntro;
const url = `${SITE_URL}/tools/tarot/cards`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, siteName: SITE_NAME, type: "website", locale: "ko_KR" },
  twitter: { card: "summary", title, description },
};

export default function TarotCardsPage() {
  return <CardsDictionaryShell />;
}
