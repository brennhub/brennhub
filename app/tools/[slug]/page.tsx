import { notFound } from "next/navigation";
import { tools } from "@/lib/tools-registry";
import { ClientSlugPage } from "./client-page";

export function generateStaticParams() {
  return tools
    .filter((t) => t.status === "coming-soon")
    .map((tool) => ({ slug: tool.slug }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = tools.find((t) => t.slug === slug);

  if (!tool) {
    notFound();
  }

  return <ClientSlugPage tool={tool} />;
}
