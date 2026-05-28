import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("cron-trans");

export default function CronTransLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
