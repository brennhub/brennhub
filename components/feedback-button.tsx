"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { FeedbackDialog, type FeedbackTool } from "./feedback-dialog";

function toolFromPath(pathname: string | null): FeedbackTool | undefined {
  if (!pathname) return undefined;
  if (pathname.startsWith("/tools/email-diag")) return "email-diag";
  if (pathname.startsWith("/tools/cron-trans")) return "cron-trans";
  if (pathname.startsWith("/tools/stock-sim")) return "stock-sim";
  if (pathname === "/" || pathname === "") return undefined;
  return "site";
}

export function FeedbackButton() {
  const pathname = usePathname();
  const t = useMessages().feedback;
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith("/admin")) return null;

  const defaultTool = toolFromPath(pathname);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.button}
        className="fixed bottom-6 right-6 z-40 flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-lg transition-colors hover:bg-muted"
      >
        <MessageSquare className="size-4" />
        <span className="hidden sm:inline">{t.button}</span>
      </button>
      <FeedbackDialog
        open={open}
        onOpenChange={setOpen}
        defaultTool={defaultTool}
      />
    </>
  );
}
