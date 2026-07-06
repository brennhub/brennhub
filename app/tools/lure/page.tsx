import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";

export const metadata: Metadata = toolMetadata("lure");

export default function LurePage() {
  return <GameShell gameId="lure" slug="lure" />;
}
