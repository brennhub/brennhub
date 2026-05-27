import { toolMetadata } from "@/lib/seo";

export const metadata = toolMetadata("stock-sim");

export default function StockSimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
