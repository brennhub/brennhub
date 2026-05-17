"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "new" | "read" | "resolved";

const NEXT: Record<Status, Status> = {
  new: "read",
  read: "resolved",
  resolved: "new",
};

const LABEL: Record<Status, string> = {
  new: "새 피드백",
  read: "확인",
  resolved: "해결됨",
};

const CLS: Record<Status, string> = {
  new: "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900",
  read: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
  resolved:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900",
};

function isStatus(v: string): v is Status {
  return v === "new" || v === "read" || v === "resolved";
}

export function StatusButton({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cur: Status = isStatus(status) ? status : "new";

  const handleClick = () => {
    start(async () => {
      const next = NEXT[cur];
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${CLS[cur]}`}
      title="다음 상태로 변경"
    >
      {LABEL[cur]}
    </button>
  );
}
