import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";

export const metadata: Metadata = toolMetadata("singularity");

export default function SingularityPage() {
  return <GameShell gameId="sing" slug="singularity" />;
}
