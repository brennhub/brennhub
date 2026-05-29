import { TagItClientShell } from "./client-shell";
import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("tag-it");

export default function TagItPage() {
  return <TagItClientShell />;
}
