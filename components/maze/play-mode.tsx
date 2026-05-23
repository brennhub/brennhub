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
 */
export function PlayMode({ project, onBackToEdit }: Props) {
  const t = useMessages().maze;
  const [state, setState] = useState<PlayState | null>(() =>
    initialPlayState(project.grid),
  );

  // project가 바뀌면(편집→플레이 재진입 시 grid 변경 가능성) state 리셋.
  useEffect(() => {
    setState(initialPlayState(project.grid));
  }, [project.grid]);

  const handleMove = useCallback(
    (dir: Dir) => {
      setState((s) => (s ? applyMove(s, dir, project.grid) : s));
    },
    [project.grid],
  );

  const handleRestart = useCallback(() => {
    setState(initialPlayState(project.grid));
  }, [project.grid]);

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
      <PlayControls onMove={handleMove} disabled={state.won} />
      <WinDialog
        open={state.won}
        onRestart={handleRestart}
        onBackToEdit={onBackToEdit}
      />
    </div>
  );
}
