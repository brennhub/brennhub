"use client";

import { useMessages } from "@/lib/i18n/provider";
import { TarotCard } from "../tarot-card";
import { HoldButton } from "./hold-button";

/**
 * S6 정/역 선택 ★시그니처 — 2층 구조의 사용자 접점.
 * 숨은 방향 비트는 S4에서 이미 고정. 여기서의 전역 선택은 그 상태를
 * 그대로 보존하거나(정방향) 전부 반전한다(역방향). 단순 '방향 고르기'가 아니다.
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
