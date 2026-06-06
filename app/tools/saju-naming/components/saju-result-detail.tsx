import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  SajuSipsin,
  SajuRelations,
  RelationEntry,
  RelationKind,
} from "@/app/tools/saju-naming/lib/saju";

/** 5 그룹별 라벨 (한자 보조 포함). */
const GROUP_LABELS: Record<keyof SajuSipsin["groupCounts"], string> = {
  비겁: "비겁(比劫)",
  식상: "식상(食傷)",
  재성: "재성(財星)",
  관성: "관성(官星)",
  인성: "인성(印星)",
};

const RELATION_LABELS: Record<RelationKind, string> = {
  천간합: "천간합",
  지지육합: "지지 육합",
  삼합: "삼합",
  방합: "방합",
  충: "충",
  삼형: "삼형",
  상형: "상형",
  자형: "자형",
  파: "파",
  해: "해",
  원진: "원진",
};

function flattenRelations(r: SajuRelations): RelationEntry[] {
  return [
    ...r.ganHap,
    ...r.jiHap,
    ...r.samhap,
    ...r.banghap,
    ...r.chung,
    ...r.hyung,
    ...r.pa,
    ...r.hae,
    ...r.wonjin,
  ];
}

function pillarKor(p: "year" | "month" | "day" | "hour"): string {
  return p === "year" ? "년" : p === "month" ? "월" : p === "day" ? "일" : "시";
}

export function DetailSection({
  sipsin,
  relations,
}: {
  sipsin: SajuSipsin;
  relations?: SajuRelations;
}) {
  const allRelations = relations ? flattenRelations(relations) : [];
  const hasRelations = allRelations.length > 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">십신·합충 (상세)</CardTitle>
      </CardHeader>
      <CardContent>
        <details className="group">
          <summary className="cursor-pointer select-none text-sm text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90">
              ▸
            </span>
            펼쳐서 보기 — 십신(일간 기준 관계 5분류)
            {hasRelations ? " · 합충형파해(글자 간 관계)" : ""}
          </summary>

          <div className="mt-4 flex flex-col gap-5">
            {/* 십신 — 천간 4개 + 5 그룹 카운트 */}
            <section>
              <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                십신
              </h4>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                일간 = {sipsin.dayStem}. 일간 기준 다른 천간과의 오행·음양
                관계를 10가지로 분류합니다.
              </p>

              {/* 4 기둥 천간 십신 */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                {(["year", "month", "day", "hour"] as const).map((pos) => {
                  const sp =
                    pos === "year"
                      ? sipsin.year
                      : pos === "month"
                        ? sipsin.month
                        : pos === "day"
                          ? sipsin.day
                          : sipsin.hour;
                  return (
                    <div
                      key={pos}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/50"
                    >
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {pillarKor(pos)}주 천간
                      </span>
                      <div className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {sp ? sp.stemSipsin : "미지"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 5 그룹 카운트 (지장간 일수 비례) */}
              <div className="mt-3">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  5 그룹 카운트 (천간 1점 + 지장간 일수 비례, 합 ≈ 8)
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(GROUP_LABELS) as Array<
                    keyof SajuSipsin["groupCounts"]
                  >).map((g) => (
                    <span
                      key={g}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs tabular-nums dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <span className="text-zinc-600 dark:text-zinc-400">
                        {GROUP_LABELS[g]}
                      </span>{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {sipsin.groupCounts[g].toFixed(2)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* 합충 — relations 있을 때만 */}
            {hasRelations && (
              <section>
                <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  합충형파해 ({allRelations.length}건)
                </h4>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  글자 간 어울림·충돌 관계. (감지·표시만 — 현재 추천에 미반영)
                </p>
                <ul className="mt-2 space-y-1.5">
                  {allRelations.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900/50"
                    >
                      <span className="mr-2 inline-block rounded bg-zinc-200 px-1.5 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        {RELATION_LABELS[r.kind]}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {r.members.join(" · ")}
                      </span>
                      {r.resultOhaeng && (
                        <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                          → {r.resultOhaeng}
                        </span>
                      )}
                      <span className="ml-2 text-zinc-400 dark:text-zinc-500">
                        (
                        {r.positions
                          .map((p) =>
                            p === "year" || p === "month" || p === "day" || p === "hour"
                              ? pillarKor(p)
                              : String(p),
                          )
                          .join("·")}
                        )
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
