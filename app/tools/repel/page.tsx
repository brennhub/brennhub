import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";

export const metadata: Metadata = toolMetadata("repel");

export default function RepelPage() {
  return <GameShell gameId="repel" slug="repel" />;
}
