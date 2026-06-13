"use client";

import { useMessages } from "@/lib/i18n/provider";

/**
 * S1 그라운딩 — 시간 제한 없는 호흡 단계. 자동 전환 폐기(2026-06-13): 사용자가
 * "준비됐어요"를 누를 때 질문으로 진행한다(그 제스처에서 BGM 시작 — 부모가 처리).
 * 그라운딩 동안은 침묵 = 호흡에 집중. 다크 패널은 테마 무관 고정색 —
 * 라이트 모드에서도 "어두운 전환"이 성립해야 한다.
 */
export function GroundingStage({ onReady }: { onReady: () => void }) {
  const tt = useMessages().tarot;

  return (
    // -mx-6 + px-6: main의 px-6 패딩을 상쇄해 다크 패널을 가로로 가득 (배경 확대), 내용은 다시 들여씀
    <div className="-mx-6 flex min-h-[70dvh] flex-1 animate-in flex-col items-center justify-center gap-12 rounded-2xl bg-[oklch(0.13_0_0)] px-6 text-[oklch(0.93_0_0)] fade-in duration-1000">
      <div
        aria-hidden="true"
        className="size-24 animate-tarot-breathe rounded-full bg-current motion-reduce:animate-none motion-reduce:opacity-60"
      />
      <p className="animate-in px-8 text-center text-sm tracking-wide fade-in [animation-delay:1200ms] [animation-duration:1000ms] [animation-fill-mode:both]">
        {tt.groundingLine}
      </p>
      <button
        type="button"
        onClick={onReady}
        className="animate-in rounded-lg px-8 py-3 text-sm font-medium text-[oklch(0.93_0_0)] ring-1 ring-[oklch(0.93_0_0/0.4)] fade-in [animation-delay:2000ms] [animation-duration:1000ms] [animation-fill-mode:both] hover:bg-[oklch(0.93_0_0/0.08)]"
      >
        {tt.groundingReady}
      </button>
    </div>
  );
}
