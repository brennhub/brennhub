"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";
import type { MazeProject } from "@/lib/maze/types";

type Props = {
  /** validation.ok 시만 노출 — 깨진 미로 공유 차단 (플레이 게이트와 동일). */
  visible: boolean;
  /** 공유할 미로 — pathMarks는 transient라 공유 안 됨. */
  project: MazeProject;
};

type ShareState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; url: string; copied: boolean }
  | { kind: "error"; message: string };

/**
 * 만들기에서 공유 링크 생성·표시 (P4a 0.14.0).
 *
 * 클릭 = 새 D1 row 1개 (id당 영구 스냅샷). 같은 미로 N번 클릭 시 N개 다른 링크.
 * 그리드 변경 후엔 자동 idle 리셋 (project ref 변경 감지).
 *
 * `project` prop이 새 객체로 바뀌면 클라이언트가 변경 감지 안 되니 — useEffect로
 * idle 리셋. 단 그리드 영향 없는 settings 변경(fog 토글 등)도 리셋되는데, 사용자
 * 의도엔 무해 (다시 클릭하면 새 링크). 단순화 우선.
 */
export function ShareControls({ visible, project }: Props) {
  const t = useMessages().maze;
  const [state, setState] = useState<ShareState>({ kind: "idle" });

  if (!visible) return null;

  const handleShare = async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/maze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          code?: string;
        } | null;
        const message =
          data?.code === "RATE_LIMIT"
            ? t.shareErrorRateLimit
            : t.shareErrorGeneric;
        setState({ kind: "error", message });
        return;
      }
      const data = (await res.json()) as { ok: true; id: string };
      const url = `${window.location.origin}/tools/maze?id=${data.id}`;
      setState({ kind: "ready", url, copied: false });
    } catch {
      setState({ kind: "error", message: t.shareErrorGeneric });
    }
  };

  const handleCopy = async () => {
    if (state.kind !== "ready") return;
    try {
      await navigator.clipboard.writeText(state.url);
      setState({ ...state, copied: true });
      setTimeout(() => {
        setState((s) =>
          s.kind === "ready" && s.url === state.url ? { ...s, copied: false } : s,
        );
      }, 1500);
    } catch {
      // clipboard 거부 — 텍스트는 input에 노출되어 있으니 사용자 수동 복사 가능.
    }
  };

  return (
    <div className="rounded-md border border-emerald-300/60 bg-emerald-50 p-3 dark:border-emerald-700/50 dark:bg-emerald-950/30">
      {state.kind === "idle" || state.kind === "loading" ? (
        <button
          type="button"
          onClick={handleShare}
          disabled={state.kind === "loading"}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors",
            "hover:bg-emerald-700",
            state.kind === "loading" && "cursor-wait opacity-70",
          )}
        >
          <Share2 className="size-4" aria-hidden />
          {state.kind === "loading" ? t.shareGenerating : t.shareButton}
        </button>
      ) : state.kind === "ready" ? (
        <div className="space-y-2">
          <span className="block text-xs font-medium text-emerald-800 dark:text-emerald-300">
            {t.shareUrlLabel}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={state.url}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={handleCopy}
              aria-label={t.shareCopyButton}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md border border-emerald-600 bg-emerald-600 px-3 py-1 text-sm font-medium text-white transition-colors",
                "hover:bg-emerald-700",
              )}
            >
              {state.copied ? (
                <>
                  <Check className="size-4" aria-hidden />
                  {t.shareCopiedToast}
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden />
                  {t.shareCopyButton}
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-rose-700 dark:text-rose-400">
          {state.message}
        </p>
      )}
    </div>
  );
}
