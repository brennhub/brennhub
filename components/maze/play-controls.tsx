"use client";

import { useEffect } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessages } from "@/lib/i18n/provider";
import type { Dir } from "@/lib/maze/play";

type Props = {
  onMove: (dir: Dir) => void;
  /** 승리 후엔 입력 비활성 — 모달이 떠 있으므로. */
  disabled?: boolean;
  /** 사운드 음소거 상태 (0.13.0). 전역 localStorage 영속 — play-mode가 관리. */
  muted: boolean;
  onToggleMute: () => void;
};

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

/**
 * 플레이 조작 — 키보드(방향키/WASD) + 화면 D-pad.
 *
 * 키보드: window keydown 리스너. 방향키는 preventDefault — 페이지 스크롤 방지.
 * D-pad: 데스크탑·모바일 공통으로 항상 표시 (입력 가이드 + 터치 입력).
 */
export function PlayControls({
  onMove,
  disabled,
  muted,
  onToggleMute,
}: Props) {
  const t = useMessages().maze;

  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      // modifier 키 조합은 OS 단축키와 충돌하므로 무시.
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const dir = KEY_TO_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      onMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove, disabled]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t.playIntro}</p>
        {/* 사운드 음소거 토글 (0.13.0) — 사운드 사용자 발견·차단 모두 빠르게. */}
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? t.soundUnmute : t.soundMute}
          aria-pressed={muted}
          title={muted ? t.soundUnmute : t.soundMute}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors",
            "hover:bg-muted hover:text-foreground",
          )}
        >
          {muted ? (
            <VolumeX className="size-4" />
          ) : (
            <Volume2 className="size-4" />
          )}
        </button>
      </div>
      <div
        role="group"
        aria-label="d-pad"
        className="mx-auto grid w-32 grid-cols-3 grid-rows-3 gap-1"
      >
        <span aria-hidden />
        <DPadButton
          ariaLabel={t.playControlsUp}
          onClick={() => onMove("up")}
          disabled={disabled}
        >
          <ArrowUp className="size-4" />
        </DPadButton>
        <span aria-hidden />
        <DPadButton
          ariaLabel={t.playControlsLeft}
          onClick={() => onMove("left")}
          disabled={disabled}
        >
          <ArrowLeft className="size-4" />
        </DPadButton>
        <span aria-hidden />
        <DPadButton
          ariaLabel={t.playControlsRight}
          onClick={() => onMove("right")}
          disabled={disabled}
        >
          <ArrowRight className="size-4" />
        </DPadButton>
        <span aria-hidden />
        <DPadButton
          ariaLabel={t.playControlsDown}
          onClick={() => onMove("down")}
          disabled={disabled}
        >
          <ArrowDown className="size-4" />
        </DPadButton>
        <span aria-hidden />
      </div>
    </div>
  );
}

function DPadButton({
  children,
  ariaLabel,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors",
        "hover:bg-muted active:bg-muted/70",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      {children}
    </button>
  );
}
