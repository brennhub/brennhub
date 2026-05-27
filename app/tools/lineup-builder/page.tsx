import { LineupBuilderClientShell } from "./client-shell";
import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("lineup-builder");

export default function LineupBuilderPage() {
  return <LineupBuilderClientShell />;
}
