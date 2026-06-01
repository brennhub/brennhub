"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { fetchVisitCount } from "@/lib/hub/visits";

/**
 * Hub 카드 visit count 표시 (30일 누적).
 * 임계치 미만이면 미노출 — 시드 단계 카드 깔끔.
 * TODO: 디버깅 임시로 1. 실 사용량 늘면 5로 환원.
 */
type Props = {
  slug: string;
};

const VISIBLE_THRESHOLD = 1;

export function VisitCounter({ slug }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVisitCount(slug, 30).then((c) => {
      if (!cancelled) setCount(c);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (count === null || count < VISIBLE_THRESHOLD) return null;

  return (
    <span
      aria-label={`${count} visits in last 30 days`}
      className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400"
    >
      <Eye aria-hidden className="size-3.5" />
      {count}
    </span>
  );
}
