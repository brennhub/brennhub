"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { DECK_SIZE } from "@/lib/tarot/ritual-state";
import { TarotCard } from "../tarot-card";

/**
 * S5 스프레드 선택 — 봉인된 덱 22장을 뒷면으로 펼치고 사용자가 3장을 직접 탭한다.
 * 좌→우(윗줄→아랫줄) = 봉인 덱 순서 0→21 그대로, 추가 난수 없음 — 봉인이 전체
 * 순서를 덮으므로 임의 위치 선택도 커밋-리빌 무결. 탭 = 확정(취소 없음),
 * 1번째=과거·2번째=현재·3번째=미래. 뽑힌 자리는 빈 슬롯로 남는다(재배열 없음).
 *
 * 레이아웃 재량: 단일 호 22장은 390px에서 탭 폭이 ~12px라 오탭 위험 — 11×2 두 줄
 * 호(row당 겹침 28px 스트립)로 절충. 카드는 sm을 2/3 스케일(64px 폭).
 */
type DealStageProps = {
  pickedIndices: readonly number[];
  onPick: (index: number) => void;
  onDone: () => void;
};

const ROW_SIZE = 11;
/** 호 연출 — 줄 중앙에서 멀수록 아래로 처지고 바깥으로 기운다. */
const arcStyle = (col: number) => {
  const off = col - (ROW_SIZE - 1) / 2;
  return {
    transform: `translateY(${Math.abs(off) * Math.abs(off) * 1.1}px) rotate(${off * 2}deg)`,
  };
};

export function DealStage({ pickedIndices, onPick, onDone }: DealStageProps) {
  const tt = useMessages().tarot;
  const positions = [tt.positionPast, tt.positionPresent, tt.positionFuture];

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (pickedIndices.length !== 3) return;
    const id = setTimeout(() => onDoneRef.current(), 800);
    return () => clearTimeout(id);
  }, [pickedIndices.length]);

  return (
    <div className="flex flex-1 animate-in flex-col items-center justify-center gap-8 fade-in duration-700">
      <p className="text-center text-sm text-muted-foreground">{tt.spreadInstruction}</p>

      <div className="flex items-start justify-center gap-3">
        {positions.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <span className="text-xs tracking-wide text-muted-foreground">{label}</span>
            {i < pickedIndices.length ? (
              <TarotCard
                face="back"
                size="sm"
                className="animate-in fade-in zoom-in-95 duration-500"
              />
            ) : (
              <div className="aspect-[7/12] w-24 rounded-xl border-2 border-dashed border-foreground/20" />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        {[0, 1].map((row) => (
          <div key={row} className="flex justify-center">
            {Array.from({ length: ROW_SIZE }, (_, col) => {
              const index = row * ROW_SIZE + col;
              if (index >= DECK_SIZE) return null;
              const picked = pickedIndices.includes(index);
              return (
                <div
                  key={index}
                  className={cn("h-[110px] w-16 origin-bottom", col > 0 && "-ml-9")}
                  style={arcStyle(col)}
                >
                  {picked ? (
                    // 빈자리 유지 — 재배열 없음, 비인터랙티브
                    <div
                      aria-hidden="true"
                      className="aspect-[7/12] w-16 rounded-lg border border-dashed border-foreground/20"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={pickedIndices.length >= 3}
                      onClick={() => onPick(index)}
                      aria-label={tt.spreadCardAria.replace("{n}", String(index + 1))}
                      className="block select-none origin-top-left scale-[0.667] cursor-pointer disabled:cursor-default"
                    >
                      <TarotCard face="back" size="sm" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
