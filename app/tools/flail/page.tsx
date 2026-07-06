import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";

export const metadata: Metadata = toolMetadata("flail");

export default function FlailPage() {
  return <GameShell gameId="flail" slug="flail" />;
}
