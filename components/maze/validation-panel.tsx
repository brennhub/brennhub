"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";
import type {
  RuleResult,
  ValidationFailureCode,
  ValidationResult,
} from "@/lib/maze/validate";

type Props = {
  result: ValidationResult;
};

/**
 * Step2 그리기 중 표시되는 완결성 검증 상태 패널.
 *
 * 통과: 단일 줄 녹색 배지 "플레이 가능".
 * 실패: 빨간 배지 + 가장 critical한 실패 사유 한 줄. 펼치면 규칙별 ok/사유.
 *
 * 검증 자체는 lib/maze/validate.ts pure 함수가 담당 — 본 컴포넌트는 표시만.
 * plan/공유 버튼은 P3b/P4 영역이라 여기에 두지 않는다.
 */
export function ValidationPanel({ result }: Props) {
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
        // TS exhaustiveness 가드 — V2에서 새 code 추가 시 컴파일 에러로 강제 처리.
        const _exhaustive: never = code;
        return _exhaustive;
      }
    }
  };

  // critical 실패 사유 = endpoints → reachability 순서.
  const criticalReason = (() => {
    if (result.endpoints.ok === false) return codeToMessage(result.endpoints.code);
    if (result.reachability.ok === false)
      return codeToMessage(result.reachability.code);
    return null;
  })();

  const ruleLabel = (rule: RuleResult, isReachability: boolean): string => {
    if (rule.ok) return t.validationTitlePass;
    // endpoints 미통과로 reachability가 skipped면 별도 라벨.
    if (isReachability && rule.code === "skipped") return t.validationSkipped;
    return codeToMessage(rule.code);
  };

  if (result.ok) {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <Check className="size-4" aria-hidden="true" />
        <span>{t.validationTitlePass}</span>
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
