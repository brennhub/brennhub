import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { GameShell } from "@/components/arcade/game-shell";
import { guardDevOnly } from "@/lib/env.server";

export const metadata: Metadata = toolMetadata("lure");
export const dynamic = "force-dynamic"; // 런타임 env로 prod 게이트 판정 (정적 프리렌더 방지).

export default async function LurePage() {
  await guardDevOnly("lure"); // prod에선 dev 전용 게임 404.
  return <GameShell gameId="lure" slug="lure" />;
}
