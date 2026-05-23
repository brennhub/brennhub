"use client";

import { useCallback, useEffect, useState } from "react";
import { useMessages } from "@/lib/i18n/provider";
import type { MazeProject } from "@/lib/maze/types";
import {
  applyMove,
  initialPlayState,
  type Dir,
  type PlayState,
} from "@/lib/maze/play";
import { getSoundController } from "@/lib/maze/sound";
import { PlayCanvas } from "./play-canvas";
import { PlayControls } from "./play-controls";
import { WinDialog } from "./win-dialog";

type Props = {
  project: MazeProject;
  /** "편집으로 돌아가기" — Step2로 복귀시킨다 (client-shell에서 처리). */
  onBackToEdit: () => void;
};

/**
 * Step3 플레이 모드 컨테이너 — PlayState orchestration.
 *
 * 진입점은 본 컴포넌트로 단일화 — P4 공유 진입(short_id로 fetch한 project)도
 * 같은 props로 들어온다. 상태는 자급(useState) — client-shell이 신경 쓰지 않는다.
 *
 * 빈/이상 project 가드: `initialPlayState`가 null이면 진입 차단 메시지 표시 —
 * StepNav가 disabledSteps로 검증 미통과 시 플레이 단계 진입을 막지만 방어적 fallback.
 *
 * 사운드 (0.13.0): mount 시 sound.init() (autoplay 정책 우회 — StepNav user gesture
 * 후속). handleMove에서 applyMove 결과 비교로 이벤트 추론:
 *   - next === prev (same object, P3b 결정) → playBlocked(dir)
 *   - !prev.won && next.won → playWin()
 *   - else → playMove()
 * play.ts(순수 결정론)는 무변경 — 사운드는 컴포넌트 트리거만.
 */
export function PlayMode({ project, onBackToEdit }: Props) {
  const t = useMessages().maze;
  const [state, setState] = useState<PlayState | null>(() =>
    initialPlayState(project.grid),
  );
  // 사운드 음소거 — localStorage 영속 (sound.ts singleton 안에서 관리). UI 동기화용 state.
  const [muted, setMuted] = useState(false);

  // mount: 사운드 초기화 (idempotent — 매 진입마다 호출 OK) + muted 상태 동기화.
  useEffect(() => {
    const sound = getSoundController();
    sound.init();
    setMuted(sound.isMuted());
  }, []);

  // project가 바뀌면(편집→플레이 재진입 시 grid 변경 가능성) state 리셋.
  useEffect(() => {
    setState(initialPlayState(project.grid));
  }, [project.grid]);

  const handleMove = useCallback(
    (dir: Dir) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = applyMove(prev, dir, project.grid);
        const sound = getSoundController();
        if (next === prev) {
          // applyMove가 차단 시 same object 반환 (play.ts P3b 결정 + Phase A 유지).
          sound.playBlocked(dir);
        } else if (!prev.won && next.won) {
          sound.playWin();
        } else {
          sound.playMove();
        }
        return next;
      });
    },
    [project.grid],
  );

  const handleRestart = useCallback(() => {
    setState(initialPlayState(project.grid));
  }, [project.grid]);

  const handleToggleMute = useCallback(() => {
    const sound = getSoundController();
    const next = !sound.isMuted();
    sound.setMuted(next);
    setMuted(next);
  }, []);

  if (!state) {
    return (
      <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        {t.playNotReadyHint}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PlayCanvas
        grid={project.grid}
        width={project.width}
        height={project.height}
        theme={project.theme}
        player={state.player}
        fogOfWar={project.fogOfWar}
        fogRadius={project.fogRadius}
        playViewSpan={project.playViewSpan}
      />
      <PlayControls
        onMove={handleMove}
        disabled={state.won}
        muted={muted}
        onToggleMute={handleToggleMute}
      />
      <WinDialog
        open={state.won}
        onRestart={handleRestart}
        onBackToEdit={onBackToEdit}
      />
    </div>
  );
}
