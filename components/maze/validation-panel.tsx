"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";
import type {
  MazeScore,
  RuleResult,
  ValidationFailureCode,
  ValidationResult,
  WeaknessCode,
} from "@/lib/maze/validate";

type Props = {
  result: ValidationResult;
  /** 완결성 통과 시 산출되는 품질 점수. 미통과 시 null. */
  score: MazeScore | null;
};

/**
 * Step2 그리기 중 표시되는 완결성·점수 패널.
 *
 * - 미통과: ✗ + critical 사유 + 펼침 시 규칙별 상태 (P3a 원안).
 * - 통과: 별점 + 통과 마크 헤드라인 + 차원 바 3개(detour/corridor/texture)
 *   + weakness 안내 (있을 때만). 점수는 게이팅 X — Step3 활성 조건은 result.ok만.
 *
 * 임계값/공식 튜닝은 `lib/maze/validate.ts` `SCORE_TUNING` 한 블록에서.
 */
export function ValidationPanel({ result, score }: Props) {
  const t = useMessages().maze;
  const [expanded, setExpanded] = useState(false);

  const codeToMessage = (code: ValidationFailureCode): string => {
    switch (code) {
      case "no-start":
        return t.validationNoStart;
      case "multiple-starts":
        return t.validationMultiStart;
      case "no-goal":
        return t.validationNoGoal;
      case "unreachable-goals":
        return t.validationUnreachable;
      case "skipped":
        return t.validationSkipped;
      default: {
        const _exhaustive: never = code;
        return _exhaustive;
      }
    }
  };

  const weaknessToMessage = (code: WeaknessCode): string => {
    switch (code) {
      case "low-detour":
        return t.weakLowDetour;
      case "no-corridors":
        return t.weakNoCorridors;
      case "no-texture":
        return t.weakNoTexture;
      default: {
        const _exhaustive: never = code;
        return _exhaustive;
      }
    }
  };

  const criticalReason = (() => {
    if (result.endpoints.ok === false) return codeToMessage(result.endpoints.code);
    if (result.reachability.ok === false)
      return codeToMessage(result.reachability.code);
    return null;
  })();

  const ruleLabel = (rule: RuleResult, isReachability: boolean): string => {
    if (rule.ok) return t.validationTitlePass;
    if (isReachability && rule.code === "skipped") return t.validationSkipped;
    return codeToMessage(rule.code);
  };

  if (result.ok) {
    return (
      <div
        role="status"
        className="rounded-md border border-emerald-300/60 bg-emerald-50 text-sm text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        {/* 헤드라인 — 별점이 주, 통과 마크는 보조. */}
        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "size-5",
                  score && n <= score.stars
                    ? "fill-emerald-500 text-emerald-500 dark:fill-emerald-400 dark:text-emerald-400"
                    : "text-emerald-300 dark:text-emerald-700",
                )}
                aria-hidden
              />
            ))}
            {score && (
              <span className="sr-only">
                {t.scoreStarsAria.replace("{n}", String(score.stars))}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 font-medium">
            <Check className="size-4" aria-hidden />
            {t.validationTitlePass}
          </span>
        </div>

        {score && (
          <>
            {/* 차원 바 3개 — 한눈에 어디가 약한지. */}
            <div className="space-y-1.5 border-t border-emerald-300/60 px-3 py-2 dark:border-emerald-700/50">
              <DimRow label={t.scoreDimDetour} value={score.detour.norm} />
              <DimRow label={t.scoreDimCorridors} value={score.corridor.norm} />
              <DimRow label={t.scoreDimTexture} value={score.texture.norm} />
            </div>

            {/* Weakness — 가장 약한 차원 안내 (있을 때만). */}
            {score.weakness && (
              <div className="flex items-start gap-2 border-t border-emerald-300/60 px-3 py-2 text-xs text-amber-700 dark:border-emerald-700/50 dark:text-amber-400">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{weaknessToMessage(score.weakness)}</span>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-md border border-rose-300/60 bg-rose-50 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium"
      >
        <X className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          <span className="font-semibold">{t.validationTitleFail}</span>
          {criticalReason && (
            <>
              <span className="mx-1.5 opacity-50">·</span>
              <span className="font-normal">{criticalReason}</span>
            </>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
        )}
        <span className="sr-only">
          {expanded ? t.validationCollapse : t.validationExpand}
        </span>
      </button>
      {expanded && (
        <ul className="space-y-1 border-t border-rose-300/60 px-3 py-2 dark:border-rose-700/50">
          <RuleRow
            label={t.validationRuleEndpoints}
            ok={result.endpoints.ok}
            detail={ruleLabel(result.endpoints, false)}
          />
          <RuleRow
            label={t.validationRuleReachability}
            ok={result.reachability.ok}
            detail={ruleLabel(result.reachability, true)}
            skipped={
              result.reachability.ok === false &&
              result.reachability.code === "skipped"
            }
          />
        </ul>
      )}
    </div>
  );
}

function DimRow({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-900/50">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] dark:bg-emerald-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums opacity-70">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function RuleRow({
  label,
  ok,
  detail,
  skipped,
}: {
  label: string;
  ok: boolean;
  detail: string;
  skipped?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {ok ? (
        <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : skipped ? (
        <span
          className="inline-block size-3.5 shrink-0 rounded-full border border-current opacity-60"
          aria-hidden="true"
        />
      ) : (
        <X className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
      )}
      <span className={cn("font-medium", skipped && "opacity-70")}>{label}</span>
      <span className="opacity-60">— {detail}</span>
    </li>
  );
}
