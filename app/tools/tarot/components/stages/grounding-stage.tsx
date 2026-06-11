"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/lib/i18n/provider";

/**
 * S1 그라운딩 — 약 7초 고정 페이싱 (3.5s 호흡 사이클 × 2, 사이클 경계 종료).
 * 스킵 없음 · 진행바 금지 (로딩처럼 보이면 실패). 다크 패널은 테마 무관 고정색 —
 * 라이트 모드에서도 "어두운 전환"이 성립해야 한다.
 */
const GROUNDING_MS = 7000;

export function GroundingStage({ onDone }: { onDone: () => void }) {
  const tt = useMessages().tarot;

  // onDone 신원 변화로 타이머가 리셋되지 않도록 ref 경유 (7초 보장)
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), GROUNDING_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="flex min-h-[70dvh] flex-1 animate-in flex-col items-center justify-center gap-12 rounded-2xl bg-[oklch(0.13_0_0)] text-[oklch(0.93_0_0)] fade-in duration-1000">
      <div
        aria-hidden="true"
        className="size-24 animate-tarot-breathe rounded-full bg-current motion-reduce:animate-none motion-reduce:opacity-60"
      />
      <p className="animate-in px-8 text-center text-sm tracking-wide fade-in [animation-delay:1200ms] [animation-duration:1000ms] [animation-fill-mode:both]">
        {tt.groundingLine}
      </p>
    </div>
  );
}
