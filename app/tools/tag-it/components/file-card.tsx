"use client";

import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberStepper } from "@/components/number-stepper";
import { TAG_IT_LIMITS } from "@/lib/tag-it/limits";
import type { FileStatus, TagFile } from "@/lib/tag-it/types";
import { ChipView } from "./chip";

type Props = {
  file: TagFile;
  capWarning: string | null;
  onToggleSelect: (chipId: string) => void;
  onDelete: (chipId: string) => void;
  onAddManual: (text: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectTop: (n: number) => void;
  onDownload: () => void;
  labels: {
    statusPending: string;
    statusProcessing: string;
    statusDone: string;
    statusError: string;
    addPlaceholder: string;
    showMore: string; // "+{n}개 더보기"
    showLess: string;
    download: string;
    counter: string; // "선택 {sel}/{max} · 후보 {cand}"
    emptyCanvas: string;
    chipSelect: string;
    chipDelete: string;
    freqTitle: string; // "{n}회 등장"
    probTitle: string; // "명사 신뢰도 {p}%"
    sectionSelected: string;
    sectionCandidate: string;
    selectedEmpty: string;
    candidateAllAdded: string;
    searchPlaceholder: string;
    searchEmpty: string;
    selectAll: string;
    deselectAll: string;
    selectTop: string; // "상위 {n} 담기"
    topNAria: string;
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
  capWarning,
  onToggleSelect,
  onDelete,
  onAddManual,
  onSelectAll,
  onDeselectAll,
  onSelectTop,
  onDownload,
  labels,
}: Props) {
  const [input, setInput] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [topN, setTopN] = useState(10);
  const [search, setSearch] = useState("");

  const statusLabel: Record<FileStatus, string> = {
    pending: labels.statusPending,
    processing: labels.statusProcessing,
    done: labels.statusDone,
    error: labels.statusError,
  };

  const { selectedChips, candidateChips } = useMemo(() => {
    const selected = file.chips.filter((c) => c.status === "selected");
    const candidate = file.chips.filter((c) => c.status === "candidate");
    return { selectedChips: selected, candidateChips: candidate };
  }, [file.chips]);

  // 검색어가 있으면 후보를 실시간 필터(부분일치) + 전부 노출(좁히는 흐름).
  const query = search.trim().toLowerCase();
  const filteredCandidates = query
    ? candidateChips.filter((c) => c.text.toLowerCase().includes(query))
    : candidateChips;
  const expanded = showAll || query.length > 0;
  const visibleCandidates = expanded
    ? filteredCandidates
    : filteredCandidates.slice(0, TAG_IT_LIMITS.defaultVisibleChips);
  const hiddenCount = filteredCandidates.length - visibleCandidates.length;

  const ready = file.status === "done";
  const chipLabels = {
    select: labels.chipSelect,
    delete: labels.chipDelete,
    freqTitle: labels.freqTitle,
    probTitle: labels.probTitle,
  };

  const commit = () => {
    const text = input.trim();
    if (!text) return;
    onAddManual(text);
    setInput("");
  };

  const counterText = labels.counter
    .replace("{sel}", String(selectedChips.length))
    .replace("{max}", String(TAG_IT_LIMITS.maxTagsPerFile))
    .replace("{cand}", String(candidateChips.length));

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
              {counterText}
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
        <div className="space-y-4 px-4 py-4">
          {/* 선택한 태그 구역 */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.sectionSelected}
            </h3>
            {selectedChips.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {labels.selectedEmpty}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {selectedChips.map((chip) => (
                  <ChipView
                    key={chip.id}
                    chip={chip}
                    labels={chipLabels}
                    onToggleSelect={() => onToggleSelect(chip.id)}
                    onDelete={() => onDelete(chip.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* 후보 구역 */}
          <section className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.sectionCandidate}
              </h3>
              {/* 일괄 조작 */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={onSelectAll}
                  disabled={candidateChips.length === 0}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {labels.selectAll}
                </button>
                <button
                  type="button"
                  onClick={onDeselectAll}
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {labels.deselectAll}
                </button>
                <div className="flex items-center gap-1">
                  <NumberStepper
                    value={String(topN)}
                    min={1}
                    max={TAG_IT_LIMITS.maxTagsPerFile}
                    smallStep={1}
                    bigStep={10}
                    showBigStep={false}
                    inputMode="numeric"
                    aria-label={labels.topNAria}
                    className="w-20"
                    onStep={(n) => setTopN(n)}
                    onInputChange={(text) => {
                      const n = Number.parseInt(text, 10);
                      if (Number.isFinite(n) && n >= 1) setTopN(n);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectTop(topN)}
                    disabled={candidateChips.length === 0}
                    className="whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {labels.selectTop.replace("{n}", String(topN))}
                  </button>
                </div>
              </div>
            </div>

            {capWarning && (
              <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                {capWarning}
              </p>
            )}

            {/* 칩 검색 — 후보가 많을 때 좁히기 (벽 펼치기 대신) */}
            {candidateChips.length > 0 && (
              <input
                type="search"
                value={search}
                placeholder={labels.searchPlaceholder}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            )}

            {candidateChips.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {file.chips.length === 0
                  ? labels.emptyCanvas
                  : labels.candidateAllAdded}
              </p>
            ) : filteredCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {labels.searchEmpty}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {visibleCandidates.map((chip) => (
                    <ChipView
                      key={chip.id}
                      chip={chip}
                      labels={chipLabels}
                      onToggleSelect={() => onToggleSelect(chip.id)}
                      onDelete={() => onDelete(chip.id)}
                    />
                  ))}
                </div>
                {!expanded &&
                  filteredCandidates.length >
                    TAG_IT_LIMITS.defaultVisibleChips && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {labels.showMore.replace("{n}", String(hiddenCount))}
                    </button>
                  )}
                {showAll && !query && (
                  <button
                    type="button"
                    onClick={() => setShowAll(false)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {labels.showLess}
                  </button>
                )}
              </>
            )}
          </section>

          {/* 직접 입력 + 다운로드 */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
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
