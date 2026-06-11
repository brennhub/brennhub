"use client";

import { useMessages } from "@/lib/i18n/provider";
import { TarotCard } from "../tarot-card";
import { HoldButton } from "./hold-button";

/**
 * S6 정/역 선택 — 단층: 여기서 고른 방향이 세 장 전체의 방향을 직접 결정한다
 * (2026-06-11 편집장 결정으로 2층 XOR 폐기). 비가역은 유지 — 선택의 무게가 시그니처.
 * 선택한 버튼을 직접 꾹 눌러(1.5s) 확정 — 확인 모달 금지.
 */
type ChoiceStageProps = {
  onConfirm: (choice: "upright" | "reversed") => void;
};

export function ChoiceStage({ onConfirm }: ChoiceStageProps) {
  const tt = useMessages().tarot;
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];

  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-10 fade-in duration-700">
      <div className="flex items-start justify-center gap-3">
        {positions.map((label) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <span className="text-xs tracking-wide text-muted-foreground">{label}</span>
            <TarotCard face="back" size="sm" />
          </div>
        ))}
      </div>

      <p className="max-w-xs text-center text-sm leading-relaxed">{tt.choiceCopy}</p>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <HoldButton label={tt.choiceUpright} onConfirm={() => onConfirm("upright")} />
        <HoldButton label={tt.choiceReversed} onConfirm={() => onConfirm("reversed")} />
        <p className="text-center text-xs text-muted-foreground">{tt.holdHint}</p>
      </div>
    </div>
  );
}
