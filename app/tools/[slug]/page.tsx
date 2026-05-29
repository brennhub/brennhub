import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tools } from "@/lib/tools-registry";
import { toolMetadata } from "@/lib/seo";
import { ClientSlugPage } from "./client-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return toolMetadata(slug);
}

export function generateStaticParams() {
  // 전용 page.tsx가 있는 슬러그는 제외 — 그렇지 않으면 [slug]와 전용
  // 페이지가 같은 /tools/<slug> 라우트를 둘 다 emit해 collision 발생.
  return tools
    .filter((t) => t.status === "coming-soon" && !t.hasPage)
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
