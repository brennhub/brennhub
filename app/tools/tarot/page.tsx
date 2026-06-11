import { TarotClientShell } from "./client-shell";
import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("tarot");

export default function TarotPage() {
  return <TarotClientShell />;
}
