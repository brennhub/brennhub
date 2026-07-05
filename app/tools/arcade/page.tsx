import type { Metadata } from "next";
import { toolMetadata } from "@/lib/seo";
import { ArcadeClientShell } from "./client-shell";

// server page.tsx라 metadata를 여기서 export (client는 layout.tsx 필요 — shooter가 빠뜨린 실수 반복 X).
export const metadata: Metadata = toolMetadata("arcade");

export default function ArcadePage() {
  return <ArcadeClientShell />;
}
