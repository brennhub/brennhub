import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  SajuGangyak,
  GangyakCategory,
  GangyakLabel,
} from "@/app/tools/saju-naming/lib/saju";
import type { OhaengAnalysis } from "@/app/tools/saju-naming/lib/ohaeng";

/** 카테고리별 색 톤 (신강 = 따뜻, 중화 = 회색, 신약 = 시원). */
const CATEGORY_TONE: Record<GangyakCategory, { box: string; chip: string }> = {
  신강: {
    box: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300",
    chip: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  },
  중화: {
    box: "border-zinc-300 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200",
    chip: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
  },
  신약: {
    box: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
    chip: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
};

/** 라벨별 1줄 작명 영향 풀이 (사용자 친화 — 명리 용어 + 짧은 한 줄). */
function nameImpactByMethod(
  method: OhaengAnalysis["yongsinMeta"]["method"],
  label: GangyakLabel,
): string {
  if (method === "simple-count") {
    return "균형/중간 사주 — 부족 오행 보강 위주로 작명 방향을 잡습니다.";
  }
  // eokbu
  if (label === "최강" || label === "강" || label === "중강") {
    return "강한 사주 — 일간 기운을 덜어내는(식상·재성·관성) 오행으로 작명 방향을 잡습니다.";
  }
  return "약한 사주 — 일간을 도와주는(인성·비겁) 오행으로 작명 방향을 잡습니다.";
}

function methodLabel(method: OhaengAnalysis["yongsinMeta"]["method"]): string {
  return method === "eokbu" ? "억부" : "단순 카운트";
}

function tendencyLabel(t: "한" | "난"): string {
  return t === "한" ? "겨울(한·습)" : "여름(난·조)";
}

/** ON/OFF 작은 배지 — 득령/득지/득세. */
function FlagChip({ label, on, hint }: { label: string; on: boolean; hint: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
        on
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-300 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-500",
      )}
      title={hint}
    >
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">{on ? "O" : "X"}</span>
    </span>
  );
}

export function GangyakSection({
  gangyak,
  ohaeng,
}: {
  gangyak: SajuGangyak;
  ohaeng: OhaengAnalysis;
}) {
  const tone = CATEGORY_TONE[gangyak.category];
  const impact = nameImpactByMethod(ohaeng.yongsinMeta.method, gangyak.label);
  const johu = ohaeng.johuMeta;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">일간 강약</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 핵심: 라벨 + 카테고리 + 작명 영향 한 줄 */}
        <div className={cn("rounded-lg border px-4 py-3", tone.box)}>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl font-semibold">{gangyak.label}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                tone.chip,
              )}
            >
              {gangyak.category}
            </span>
          </div>
          <p className="mt-1.5 text-sm">{impact}</p>
        </div>

        {/* 보조: 3원소 ON/OFF + 산출 방식 */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FlagChip
            label="득령"
            on={gangyak.deuglyeong}
            hint="월지 본기 오행이 일간을 돕는가 (비겁·인성)"
          />
          <FlagChip
            label="득지"
            on={gangyak.deukji}
            hint="일지 지장간에 일간 오행/생조 천간이 있는가 (통근)"
          />
          <FlagChip
            label="득세"
            on={gangyak.deukse}
            hint="월·일지 외 자리에서 비겁+인성 세력이 큰가"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            산출 방식: {methodLabel(ohaeng.yongsinMeta.method)}
          </span>
        </div>

        {/* 조후 보조 (있을 때만) */}
        {johu && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span className="font-medium">조후 보조</span>
            <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">
              (월령 기준 계절 보조)
            </span>
            <span className="mt-0.5 block text-xs">
              {tendencyLabel(johu.tendency)} 출생 — {johu.ohaeng}(
              {johu.ohaeng === "화" ? "火" : "水"}) 오행 권장
              {johu.conflict === "gisin" && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  · 단 현재 작명 방향과 충돌(피하는 오행) → 미반영
                </span>
              )}
              {johu.conflict === null && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  · 이미 권장 오행에 포함됨
                </span>
              )}
              {johu.conflict === "neutral" && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  · 보조 참고
                </span>
              )}
            </span>
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          일간 = 태어난 날 천간(=나). 강약은 월령(月)·통근(地)·세력(勢)으로
          가립니다.
        </p>
      </CardContent>
    </Card>
  );
}
