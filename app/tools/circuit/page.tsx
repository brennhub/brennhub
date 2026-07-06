import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";

export const metadata: Metadata = toolMetadata("circuit");

export default function CircuitPage() {
  return <GameShell gameId="circ" slug="circuit" />;
}
