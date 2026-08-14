import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Pillar } from "@/app/tools/saju-naming/lib/saju";
import type { SajuApiResponse } from "../client-shell";
import { GangyakSection } from "./saju-result-gangyak";
import { DetailSection } from "./saju-result-detail";

/** 오행별 표시 스타일 (전통 오행 색 계열). */
const OHAENG: Record<
  string,
  { label: string; bar: string; box: string; chip: string }
> = {
  목: {
    label: "목(木)",
    bar: "bg-emerald-500",
    box: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    chip: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  화: {
    label: "화(火)",
    bar: "bg-rose-500",
    box: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  },
  토: {
    label: "토(土)",
    bar: "bg-amber-500",
    box: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  금: {
    label: "금(金)",
    bar: "bg-slate-400",
    box: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300",
    chip: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  수: {
    label: "수(水)",
    bar: "bg-sky-500",
    box: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
};

const OHAENG_KEYS = ["목", "화", "토", "금", "수"] as const;

/** 천간/지지 한 글자 칸. */
function CharBox({ char, ohaeng }: { char: string; ohaeng: string }) {
  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center rounded-lg border text-2xl font-semibold",
        OHAENG[ohaeng]?.box ?? "border-zinc-300 bg-zinc-50 text-zinc-800",
      )}
    >
      {char}
    </div>
  );
}

/** 사주 한 기둥 (천간 + 지지). */
function PillarColumn({ label, pillar }: { label: string; pillar: Pillar }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <CharBox char={pillar.gan} ohaeng={pillar.ganOhaeng} />
      <CharBox char={pillar.ji} ohaeng={pillar.jiOhaeng} />
    </div>
  );
}

export function SajuResultView({ data }: { data: SajuApiResponse }) {
  const { saju, ohaeng } = data;
  const { balance, deficient, excessive, yongsin, gisin, nameDirection } =
    ohaeng;
  const total = OHAENG_KEYS.reduce((s, k) => s + balance[k], 0) || 1;
  const { lunarDate } = saju;

  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* 사주팔자 — 8글자 그리드 */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-lg">사주팔자</CardTitle>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              음력 {lunarDate.year}.{lunarDate.month}.{lunarDate.day}
              {lunarDate.intercalation ? " (윤달)" : ""}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <PillarColumn label="년주" pillar={saju.year} />
            <PillarColumn label="월주" pillar={saju.month} />
            <PillarColumn label="일주" pillar={saju.day} />
            {saju.hour ? (
              <PillarColumn label="시주" pillar={saju.hour} />
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  시주
                </span>
                <span className="text-center text-xs text-zinc-400 dark:text-zinc-500">
                  미지
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            위 칸 = 천간, 아래 칸 = 지지. 색은 각 글자의 오행을 나타냅니다.
          </p>
        </CardContent>
      </Card>

      {/* 오행 분포 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">오행 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2.5">
            {OHAENG_KEYS.map((k) => {
              const count = balance[k];
              const pct = (count / total) * 100;
              return (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">
                    {OHAENG[k].label}
                  </span>
                  <div className="h-2.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={cn("h-full rounded-full", OHAENG[k].bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                    {count}
                  </span>
                  <span className="w-9 shrink-0 text-xs">
                    {count === 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        부족
                      </span>
                    )}
                    {count >= 3 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        과다
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {(deficient.length > 0 || excessive.length > 0) && (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              {deficient.length > 0 && `부족: ${deficient.join("·")}  `}
              {excessive.length > 0 && `과다: ${excessive.join("·")}`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 작명 방향 — 용신/기신 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">작명 방향</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">
            {nameDirection}
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                이름에 넣으면 좋은 오행
              </span>
              {yongsin.length > 0 ? (
                yongsin.map((o) => (
                  <span
                    key={o}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      OHAENG[o].chip,
                    )}
                  >
                    {OHAENG[o].label}
                  </span>
                ))
              ) : (
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  특정 오행 없음 (균형)
                </span>
              )}
            </div>
            {gisin.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  피하면 좋은 오행
                </span>
                {gisin.map((o) => (
                  <span
                    key={o}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      OHAENG[o].chip,
                    )}
                  >
                    {OHAENG[o].label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 일간 강약 + 조후 (B-3-b·B-3-c) — graceful degrade: 항상 산출 가능. */}
      {saju.gangyak && (
        <GangyakSection gangyak={saju.gangyak} ohaeng={ohaeng} />
      )}

      {/* 십신·합충 상세 (B-3-a + B-2) — 접기 카드. relations 없으면 십신만. */}
      {saju.sipsin && (
        <DetailSection sipsin={saju.sipsin} relations={saju.relations} />
      )}
    </div>
  );
}
