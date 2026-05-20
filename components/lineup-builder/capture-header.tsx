"use client";

import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";

type Props = {
  teamName: string;
  managerName: string;
};

// 캡처 카드 헤더 4케이스: 둘 다 빈값 → 미렌더 / 팀명만 / 감독만 / 둘 다.
export function CaptureHeader({ teamName, managerName }: Props) {
  const t = useMessages().lineupBuilder;
  if (!teamName && !managerName) return null;
  return (
    <div className="mb-2 text-center">
      {teamName && (
        <h2 className="text-lg font-bold text-[#18181b] dark:text-[#fafafa]">
          {teamName}
        </h2>
      )}
      {managerName && (
        <p
          className={cn(
            "text-[#3f3f46] dark:text-[#d4d4d8]",
            teamName ? "text-xs" : "text-sm font-medium",
          )}
        >
          {t.managerLabel}: {managerName}
        </p>
      )}
    </div>
  );
}
