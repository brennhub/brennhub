import { LanguageMakerClientShell } from "./client-shell";
import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("language-maker");

export default function LanguageMakerPage() {
  return <LanguageMakerClientShell />;
}
