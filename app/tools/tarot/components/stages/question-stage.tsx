"use client";

import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { DOMAINS, type Domain } from "@/lib/tarot/types";

/**
 * S2 질문 — 대가 의식의 번안: 질문 직접 적기.
 * 질문 텍스트는 리듀서 state에만 존재하며 어떤 네트워크 요청에도 포함되지 않는다.
 */
type QuestionStageProps = {
  question: string;
  domain: Domain | null;
  onQuestionChange: (value: string) => void;
  onDomainSelect: (domain: Domain) => void;
  onSubmit: () => void;
};

export function QuestionStage({
  question,
  domain,
  onQuestionChange,
  onDomainSelect,
  onSubmit,
}: QuestionStageProps) {
  const tt = useMessages().tarot;
  const valid = question.trim() !== "" && domain !== null;

  return (
    <div className="flex flex-1 animate-in flex-col justify-center gap-8 fade-in duration-700">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{tt.questionTitle}</h2>
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          placeholder={tt.questionPlaceholder}
          rows={4}
          className="mt-4 w-full resize-none rounded-lg bg-card p-4 text-sm ring-1 ring-foreground/15 outline-none placeholder:text-muted-foreground/60 focus:ring-foreground/35"
        />
        <p className="mt-2 text-xs text-muted-foreground">{tt.questionShownNote}</p>
      </div>

      <div>
        <p className="text-sm font-medium">{tt.domainLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DOMAINS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDomainSelect(d)}
              aria-pressed={domain === d}
              className={cn(
                "rounded-full px-4 py-2 text-sm ring-1 transition-colors",
                domain === d
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-card text-foreground ring-foreground/15",
              )}
            >
              {tt[`domain_${d}` as keyof typeof tt] as string}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          disabled={!valid}
          onClick={onSubmit}
          className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-10"
        >
          {tt.toShuffle}
        </button>
        <p className="text-xs text-muted-foreground">{tt.questionPrivacyNote}</p>
      </div>
    </div>
  );
}
