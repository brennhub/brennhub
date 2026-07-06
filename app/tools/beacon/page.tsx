import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";

export const metadata: Metadata = toolMetadata("beacon");

export default function BeaconPage() {
  return <GameShell gameId="beacon" slug="beacon" />;
}
