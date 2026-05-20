"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import {
  DEFAULT_FORMATION_ID,
  getFormation,
} from "@/lib/lineup-builder/formations";
import type { FormationId, Player } from "@/lib/lineup-builder/types";
import { Pitch } from "@/components/lineup-builder/pitch";
import { ControlPanel } from "@/components/lineup-builder/control-panel";
import {
  EditDialog,
  type EditPayload,
} from "@/components/lineup-builder/edit-dialog";
import { CaptureHeader } from "@/components/lineup-builder/capture-header";
import { DEFAULT_TEAM_COLOR } from "@/components/lineup-builder/color-swatches";

const INPUT_CLASS =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function clonePlayers(id: FormationId): Player[] {
  return getFormation(id).players.map((p) => ({ ...p }));
}

function sanitizeFilename(teamName: string): string {
  const cleaned = teamName
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.length > 0 ? `${cleaned}-squad.png` : "brennhub-squad.png";
}

export function LineupBuilderClientShell() {
  const t = useMessages();
  const tl = t.lineupBuilder;

  const [formationId, setFormationId] =
    useState<FormationId>(DEFAULT_FORMATION_ID);
  const [players, setPlayers] = useState<Player[]>(() =>
    clonePlayers(DEFAULT_FORMATION_ID),
  );
  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [teamColor, setTeamColor] = useState(DEFAULT_TEAM_COLOR);
  const [captainId, setCaptainId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);
  const pitchRef = useRef<HTMLDivElement>(null);

  const handleFormationChange = useCallback((id: FormationId) => {
    // 포메이션 변경 시 captainId는 유지 (선수 인격 동일, 포지션만 변경).
    setFormationId(id);
    setPlayers(clonePlayers(id));
  }, []);

  const handleMove = useCallback((id: number, top: number, left: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, top, left } : p)),
    );
  }, []);

  const handleReset = useCallback(() => {
    setPlayers(clonePlayers(formationId));
    setCaptainId(null);
  }, [formationId]);

  const handleEdit = useCallback((id: number) => setEditId(id), []);
  const handleCloseEdit = useCallback(() => setEditId(null), []);

  const handleEditSave = useCallback((id: number, patch: EditPayload) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, name: patch.name, number: patch.number, position: patch.position }
          : p,
      ),
    );
    // 주장은 배타적 — 1명만. ON이면 이 선수로, OFF면 이 선수였을 때만 해제.
    setCaptainId((prev) =>
      patch.isCaptain ? id : prev === id ? null : prev,
    );
    setEditId(null);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!captureRef.current || downloading) return;
    setDownloading(true);
    try {
      const { domToBlob } = await import("modern-screenshot");
      const blob = await domToBlob(captureRef.current, { scale: 2 });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = sanitizeFilename(teamName);
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("[lineup-builder] PNG 캡처 실패:", err);
    } finally {
      setDownloading(false);
    }
  }, [downloading, teamName]);

  const editTarget =
    editId != null ? (players.find((p) => p.id === editId) ?? null) : null;
  const trimmedTeam = teamName.trim();
  const trimmedManager = managerName.trim();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-6 pb-20">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t.toolCommon.back}
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {tl.title}
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          {tl.description}
        </p>
      </header>

      <div className="mb-6 grid max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lineup-team-name"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {tl.teamNameLabel}
          </label>
          <input
            id="lineup-team-name"
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={tl.teamNamePlaceholder}
            maxLength={40}
            className={INPUT_CLASS}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="lineup-manager"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {tl.managerLabel}
          </label>
          <input
            id="lineup-manager"
            type="text"
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder={tl.managerPlaceholder}
            maxLength={40}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:order-2 md:flex-1">
          <div
            ref={captureRef}
            className="mx-auto w-full max-w-md border border-[#e4e4e7] bg-[#ffffff] p-3 dark:border-[#27272a] dark:bg-[#18181b]"
          >
            <CaptureHeader
              teamName={trimmedTeam}
              managerName={trimmedManager}
            />
            <Pitch
              players={players}
              teamColor={teamColor}
              captainId={captainId}
              pitchRef={pitchRef}
              onMove={handleMove}
              onEdit={handleEdit}
            />
          </div>
        </div>
        <div className="md:order-1 md:w-56 md:shrink-0">
          <ControlPanel
            formationId={formationId}
            onFormationChange={handleFormationChange}
            teamColor={teamColor}
            onTeamColorChange={setTeamColor}
            onDownload={handleDownload}
            onReset={handleReset}
            downloading={downloading}
          />
        </div>
      </div>

      <EditDialog
        player={editTarget}
        isCaptain={editTarget != null && captainId === editTarget.id}
        onClose={handleCloseEdit}
        onSave={handleEditSave}
      />
    </main>
  );
}
