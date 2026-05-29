"use client";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_IT_LIMITS } from "@/lib/tag-it/limits";
import { finalTags } from "@/lib/tag-it/chips";
import type { FileStatus, TagFile } from "@/lib/tag-it/types";
import { ChipView } from "./chip";

type Props = {
  file: TagFile;
  onToggleSelect: (chipId: string) => void;
  onTogglePin: (chipId: string) => void;
  onDelete: (chipId: string) => void;
  onAddManual: (text: string) => void;
  onClearSelection: () => void;
  onDownload: () => void;
  labels: {
    statusPending: string;
    statusProcessing: string;
    statusDone: string;
    statusError: string;
    addPlaceholder: string;
    showMore: string; // "+{n}개 더보기"
    showLess: string;
    clearSelection: string;
    download: string;
    tagCount: string; // "{n}/{max}"
    emptyCanvas: string;
    chipSelect: string;
    chipPin: string;
    chipUnpin: string;
    chipDelete: string;
  };
};

const STATUS_STYLE: Record<FileStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  error: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

export function FileCard({
  file,
  onToggleSelect,
  onTogglePin,
  onDelete,
  onAddManual,
  onClearSelection,
  onDownload,
  labels,
}: Props) {
  const [input, setInput] = useState("");
  const [showAll, setShowAll] = useState(false);

  const statusLabel: Record<FileStatus, string> = {
    pending: labels.statusPending,
    processing: labels.statusProcessing,
    done: labels.statusDone,
    error: labels.statusError,
  };

  // 사용자 칩(보호·채택·수동)은 항상 노출, 후보 칩만 점진 노출.
  const { userChips, candidateChips } = useMemo(() => {
    const user = file.chips.filter(
      (c) =>
        c.status === "protected" ||
        c.status === "selected" ||
        c.source === "manual",
    );
    const cand = file.chips.filter(
      (c) => c.status === "candidate" && c.source !== "manual",
    );
    return { userChips: user, candidateChips: cand };
  }, [file.chips]);

  const visibleCandidates = showAll
    ? candidateChips
    : candidateChips.slice(0, TAG_IT_LIMITS.defaultVisibleChips);
  const hiddenCount = candidateChips.length - visibleCandidates.length;

  const tagsCount = finalTags(file.chips).length;
  const ready = file.status === "done";

  const commit = () => {
    const text = input.trim();
    if (!text) return;
    onAddManual(text);
    setInput("");
  };

  const chipLabels = {
    select: labels.chipSelect,
    pin: labels.chipPin,
    unpin: labels.chipUnpin,
    delete: labels.chipDelete,
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium text-foreground">
            {file.name}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              STATUS_STYLE[file.status],
            )}
          >
            {statusLabel[file.status]}
          </span>
          {ready && (
            <span className="tnum text-xs text-muted-foreground">
              {labels.tagCount
                .replace("{n}", String(tagsCount))
                .replace("{max}", String(TAG_IT_LIMITS.maxTagsPerFile))}
            </span>
          )}
        </div>
      </div>

      {/* 본문 */}
      {file.status === "error" ? (
        <p className="px-4 py-4 text-sm text-red-600 dark:text-red-400">
          {file.error}
        </p>
      ) : ready ? (
        <div className="space-y-3 px-4 py-4">
          <div className="flex flex-wrap gap-1.5">
            {userChips.length === 0 && candidateChips.length === 0 && (
              <span className="text-xs text-muted-foreground">
                {labels.emptyCanvas}
              </span>
            )}
            {userChips.map((chip) => (
              <ChipView
                key={chip.id}
                chip={chip}
                labels={chipLabels}
                onToggleSelect={() => onToggleSelect(chip.id)}
                onTogglePin={() => onTogglePin(chip.id)}
                onDelete={() => onDelete(chip.id)}
              />
            ))}
            {visibleCandidates.map((chip) => (
              <ChipView
                key={chip.id}
                chip={chip}
                labels={chipLabels}
                onToggleSelect={() => onToggleSelect(chip.id)}
                onTogglePin={() => onTogglePin(chip.id)}
                onDelete={() => onDelete(chip.id)}
              />
            ))}
          </div>

          {candidateChips.length > TAG_IT_LIMITS.defaultVisibleChips && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showAll
                ? labels.showLess
                : labels.showMore.replace("{n}", String(hiddenCount))}
            </button>
          )}

          {/* 직접 입력 + 액션 */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              type="text"
              value={input}
              maxLength={TAG_IT_LIMITS.maxTagChars}
              placeholder={labels.addPlaceholder}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
              }}
              className="min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
            />
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
            >
              {labels.clearSelection}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Download className="size-3.5" />
              {labels.download}
            </button>
          </div>
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          {statusLabel[file.status]}
        </p>
      )}
    </div>
  );
}
