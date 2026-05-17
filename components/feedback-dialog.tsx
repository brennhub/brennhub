"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useLocale, useMessages } from "@/lib/i18n/provider";

export type FeedbackTool =
  | "site"
  | "email-diag"
  | "cron-trans"
  | "stock-sim";

type Category = "feature" | "improvement" | "complaint" | "other";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTool?: FeedbackTool;
};

const MAX_MSG = 2000;
const MIN_MSG = 5;
const SUCCESS_CLOSE_DELAY_MS = 2000;

export function FeedbackDialog({ open, onOpenChange, defaultTool }: Props) {
  const t = useMessages().feedback;
  const { locale } = useLocale();

  const [tool, setTool] = useState<FeedbackTool | null>(defaultTool ?? null);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTool(defaultTool ?? null);
      setCategory(null);
      setMessage("");
      setEmail("");
      setStatus("idle");
      setErrorMsg(null);
    }
  }, [open, defaultTool]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "submitting") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, status, onOpenChange]);

  useEffect(() => {
    if (status !== "success") return;
    const id = setTimeout(() => onOpenChange(false), SUCCESS_CLOSE_DELAY_MS);
    return () => clearTimeout(id);
  }, [status, onOpenChange]);

  if (!open) return null;

  const canSubmit =
    tool !== null &&
    category !== null &&
    message.trim().length >= MIN_MSG &&
    message.length <= MAX_MSG &&
    status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit || !tool || !category) return;
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool,
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          locale,
        }),
      });
      if (!res.ok) {
        let serverMsg: string | null = null;
        try {
          const data = (await res.json()) as { error?: string };
          serverMsg = data.error ?? null;
        } catch {
          // ignore parse error
        }
        if (res.status === 429) {
          setErrorMsg(serverMsg ?? t.errorRateLimit);
        } else {
          setErrorMsg(serverMsg ?? t.errorGeneric);
        }
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg(t.errorGeneric);
      setStatus("error");
    }
  };

  const toolOptions: { value: FeedbackTool; label: string }[] = [
    { value: "site", label: t.toolSite },
    { value: "email-diag", label: t.toolEmailDiag },
    { value: "cron-trans", label: t.toolCronTrans },
    { value: "stock-sim", label: t.toolStockSim },
  ];
  const categoryOptions: { value: Category; label: string }[] = [
    { value: "feature", label: t.categoryFeature },
    { value: "improvement", label: t.categoryImprovement },
    { value: "complaint", label: t.categoryComplaint },
    { value: "other", label: t.categoryOther },
  ];

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current && status !== "submitting") {
          onOpenChange(false);
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-card text-card-foreground shadow-lg">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2
              id="feedback-dialog-title"
              className="text-lg font-semibold"
            >
              {t.dialogTitle}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t.dialogDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => status !== "submitting" && onOpenChange(false)}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            disabled={status === "submitting"}
          >
            <X className="size-4" />
          </button>
        </div>

        {status === "success" ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              ✓ {t.success}
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-2">
              <Label className="text-sm">{t.toolLabel}</Label>
              <div className="flex flex-wrap gap-1.5">
                {toolOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={tool === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTool(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t.categoryLabel}</Label>
              <div className="flex flex-wrap gap-1.5">
                {categoryOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={category === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategory(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="feedback-message" className="text-sm">
                  {t.messageLabel}
                </Label>
                <span
                  className={cn(
                    "tnum text-xs text-muted-foreground",
                    message.length > MAX_MSG && "text-destructive",
                  )}
                >
                  {message.length}/{MAX_MSG}
                </span>
              </div>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                rows={5}
                className="flex w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="feedback-email" className="text-sm">
                {t.emailLabel}
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
              />
            </div>

            {errorMsg && (
              <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {errorMsg}
              </p>
            )}
          </div>
        )}

        {status !== "success" && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={status === "submitting"}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {status === "submitting" ? t.submitting : t.submit}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
