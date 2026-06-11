"use client";

import { useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * 봉인 해시 배지 — 기본은 앞 8자 축약("봉인 f5f27751…"), 탭/클릭 토글로
 * 전체 64자 + 설명 1줄. S4(컷 확정)와 임시 결과 화면이 동일 컴포넌트 재사용.
 */
type SealBadgeProps = {
  hash: string;
  className?: string;
};

export function SealBadge({ hash, className }: SealBadgeProps) {
  const tt = useMessages().tarot;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/15"
      >
        {tt.sealBadgeLabel} <span className="font-mono">{hash.slice(0, 8)}…</span>
      </button>
      {expanded && (
        <div className="max-w-sm animate-in text-center fade-in duration-300">
          <p className="font-mono text-[10px] break-all text-muted-foreground">{hash}</p>
          <p className="mt-1 text-xs text-muted-foreground">{tt.sealExplain}</p>
        </div>
      )}
    </div>
  );
}
