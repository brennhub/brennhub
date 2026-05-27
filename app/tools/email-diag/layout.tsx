import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("email-diag");

export default function EmailDiagLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
