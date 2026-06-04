"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { toolSlugFromPath } from "@/lib/tools/slug-from-path";
import { FeedbackDialog, type FeedbackTool } from "./feedback-dialog";

function feedbackToolFromPath(
  pathname: string | null,
): FeedbackTool | undefined {
  // toolSlugFromPath은 registry 기반 자동 매핑 — shooter 포함 모든 도구 cover.
  const slug = toolSlugFromPath(pathname);
  if (slug) return slug as FeedbackTool;
  if (!pathname || pathname === "/") return undefined;
  return "site";
}

export function FeedbackButton() {
  const pathname = usePathname();
  const t = useMessages().feedback;
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/admin")) return null;

  const defaultTool = feedbackToolFromPath(pathname);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.button}
        title={t.button}
        className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-lg transition-colors hover:bg-muted"
      >
        <MessageSquare className="size-5" />
      </button>
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        defaultTool={defaultTool}
      />
    </>
  );
}
