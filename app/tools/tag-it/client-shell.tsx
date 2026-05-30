"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { Segmented } from "./components/segmented";
import { TAG_IT_LIMITS } from "@/lib/tag-it/limits";
import { extractCandidates } from "@/lib/tag-it/extract";
import {
  buildInitialChips,
  chipId,
  deselectExtracted,
  finalTags,
  mergeReextract,
  selectCandidates,
} from "@/lib/tag-it/chips";
import {
  isDocxFile,
  readKeywords,
  readText,
  unzipDocx,
  writeKeywords,
  zipFiles,
} from "@/lib/tag-it/docx";
import { loadOptions, saveOptions } from "@/lib/tag-it/storage";
import {
  DEFAULT_EXTRACT_OPTIONS,
  type Chip,
  type ExtractOptions,
  type TagFile,
} from "@/lib/tag-it/types";
import { UploadZone } from "./components/upload-zone";
import { CommonTray } from "./components/common-tray";
import { AdvancedPanel } from "./components/advanced-panel";
import { FileCard } from "./components/file-card";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** 캐시는 전체 텍스트(본문+표) — scope 필터는 extractCandidates가 옵션으로 처리. */
const FULL_SCOPE = { body: true, tables: true } as const;

type Mode = "auto" | "manual";

function triggerDownload(bytes: Uint8Array, name: string, mime: string) {
  // Uint8Array → 새 ArrayBuffer 복사 (Blob 타입 안정)
  const buf = bytes.slice().buffer;
  const url = URL.createObjectURL(new Blob([buf], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TagItClientShell() {
  const t = useMessages();
  const tt = t.tagIt;

  const [hydrated, setHydrated] = useState(false);
  const [options, setOptions] = useState<ExtractOptions>(
    DEFAULT_EXTRACT_OPTIONS,
  );
  const [mode, setMode] = useState<Mode>("auto");
  const [files, setFiles] = useState<TagFile[]>([]);
  const [commonTags, setCommonTags] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [capNotes, setCapNotes] = useState<Record<string, string>>({});

  // 최신 files 스냅샷 — handleSelect가 setFiles updater 안에서 side-effect를 내지
  // 않고도(StrictMode 이중실행 방지) 한계 검증에 쓰도록 ref로 유지.
  const filesRef = useRef<TagFile[]>([]);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  const commonTagsRef = useRef<string[]>([]);
  useEffect(() => {
    commonTagsRef.current = commonTags;
  }, [commonTags]);

  // 재추출 마이크로 피드백 — 옵션·모드 변경 시 짧게 "갱신됨" 표시 (절제).
  // filesRef 선언 뒤에 둬야 immutability 규칙에 안 걸린다.
  const [justUpdated, setJustUpdated] = useState(false);
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseUpdated = useCallback(() => {
    if (!filesRef.current.some((f) => f.status === "done")) return;
    setJustUpdated(true);
    if (updateTimer.current) clearTimeout(updateTimer.current);
    updateTimer.current = setTimeout(() => setJustUpdated(false), 900);
  }, []);

  // 옵션 hydrate (localStorage) — 재방문 시 마지막 설정.
  useEffect(() => {
    setOptions(loadOptions());
    setHydrated(true);
  }, []);

  // 옵션 persist (hydrate 이후 변경분만).
  useEffect(() => {
    if (!hydrated) return;
    saveOptions(options);
  }, [options, hydrated]);

  // 옵션·모드 변경 시 재추출 — 사용자 칩(채택·보호·수동) 보존.
  useEffect(() => {
    if (!hydrated) return;
    setFiles((prev) =>
      prev.map((f) => {
        if (f.status !== "done" || !f.extracted) return f;
        if (mode === "manual") return f; // 수동: 후보 자동 추가 안 함, 기존 칩 유지
        const candidates = extractCandidates(f.extracted, options);
        return { ...f, chips: mergeReextract(f.chips, candidates) };
      }),
    );
     
  }, [options, mode, hydrated]);

  const doneFiles = useMemo(
    () => files.filter((f) => f.status === "done"),
    [files],
  );

  // 파일 1개 파싱·추출 (실패는 해당 카드만 error).
  const loadAndProcess = useCallback(
    async (file: File, id: string) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "processing" } : f)),
      );
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const entries = unzipDocx(bytes);
        const text = readText(entries, FULL_SCOPE); // 전체 캐시
        const existing = readKeywords(entries);
        const candidates =
          mode === "auto" ? extractCandidates(text, options) : [];
        const baseChips = buildInitialChips(candidates, existing);
        // 업로드 시점의 공통 태그도 즉시 반영
        const chips = applyCommonTags(baseChips, commonTagsRef.current);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  bytes,
                  status: "done",
                  extracted: text,
                  existingKeywords: existing,
                  chips,
                }
              : f,
          ),
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? { ...f, status: "error", error: tt.errorParse }
              : f,
          ),
        );
      }
    },
    [mode, options, tt],
  );

  // ── 업로드 + 한계 검증 ──────────────────────────────────────────────
  // filesRef로 최신 상태를 읽어 순수하게 검증 → 통과분만 추가하고 처리 시작.
  const handleSelect = useCallback(
    (incoming: File[]) => {
      setWarning(null);
      const prev = filesRef.current;

      let warn: string | null = null;
      const accepted: { file: File; tagFile: TagFile }[] = [];
      let runningTotal = prev.reduce((s, f) => s + f.size, 0);
      let slots = TAG_IT_LIMITS.maxFiles - prev.length;

      for (const file of incoming) {
        if (!isDocxFile(file.name)) {
          warn ??= tt.limitNotDocx.replace("{name}", file.name);
          continue;
        }
        if (slots <= 0) {
          warn ??= tt.limitFiles.replace("{max}", String(TAG_IT_LIMITS.maxFiles));
          break;
        }
        if (file.size > TAG_IT_LIMITS.maxFileBytes) {
          warn ??= tt.limitFileSize
            .replace("{name}", file.name)
            .replace("{max}", "8MB");
          continue;
        }
        if (runningTotal + file.size > TAG_IT_LIMITS.maxTotalBytes) {
          warn ??= tt.limitTotalSize.replace("{max}", "15MB");
          break;
        }
        runningTotal += file.size;
        slots -= 1;
        accepted.push({
          file,
          tagFile: {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            bytes: new Uint8Array(0), // loadAndProcess에서 채움
            status: "pending",
            existingKeywords: [],
            chips: [],
          },
        });
      }

      if (warn) setWarning(warn);
      if (accepted.length > 0) {
        setFiles((p) => [...p, ...accepted.map((a) => a.tagFile)]);
        for (const a of accepted) void loadAndProcess(a.file, a.tagFile.id);
      }
    },
    [tt, loadAndProcess],
  );

  // ── 칩 조작 ────────────────────────────────────────────────────────
  // 일괄 선택 cap 경고 (파일별). 다른 조작 시 해당 파일 노트 제거.
  const clearCapNote = (fileId: string) =>
    setCapNotes((prev) => {
      if (!(fileId in prev)) return prev;
      const next = { ...prev };
      delete next[fileId];
      return next;
    });

  const updateChips = useCallback(
    (fileId: string, fn: (chips: Chip[]) => Chip[]) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, chips: fn(f.chips) } : f)),
      );
      clearCapNote(fileId);
    },
    [],
  );

  const toggleSelect = (fileId: string, id: string) =>
    updateChips(fileId, (chips) =>
      chips.map((c) =>
        c.id === id
          ? { ...c, status: c.status === "selected" ? "candidate" : "selected" }
          : c,
      ),
    );

  const deleteChip = (fileId: string, id: string) =>
    updateChips(fileId, (chips) => chips.filter((c) => c.id !== id));

  const addManual = (fileId: string, text: string) => {
    const id = chipId(text);
    updateChips(fileId, (chips) => {
      const exists = chips.find((c) => c.id === id);
      if (exists)
        return chips.map((c) =>
          c.id === id ? { ...c, status: "selected" } : c,
        );
      return [
        {
          id,
          text: text.slice(0, TAG_IT_LIMITS.maxTagChars),
          status: "selected",
          score: 0,
          freq: 0,
          source: "manual",
        },
        ...chips,
      ];
    });
  };

  // ── 일괄 선택 (변경 3) — filesRef 스냅샷으로 capped 판정 후 노트 갱신 ──
  const capMessage = () =>
    tt.capWarning.replace(/\{max\}/g, String(TAG_IT_LIMITS.maxTagsPerFile));

  const selectAll = (fileId: string) => {
    const file = filesRef.current.find((f) => f.id === fileId);
    if (!file) return;
    const { chips, capped } = selectCandidates(file.chips);
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, chips } : f)),
    );
    if (capped) setCapNotes((p) => ({ ...p, [fileId]: capMessage() }));
    else clearCapNote(fileId);
  };

  const selectTop = (fileId: string, n: number) => {
    const file = filesRef.current.find((f) => f.id === fileId);
    if (!file) return;
    const { chips, capped } = selectCandidates(file.chips, n);
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, chips } : f)),
    );
    if (capped) setCapNotes((p) => ({ ...p, [fileId]: capMessage() }));
    else clearCapNote(fileId);
  };

  // 전체 해제 = 자동 추출분만 후보로. 기존 keywords·수동 입력은 보존 (파괴 방지).
  const deselectAll = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, chips: deselectExtracted(f.chips) } : f,
      ),
    );
    clearCapNote(fileId);
  };

  // ── 공통 태그 트레이 ────────────────────────────────────────────────
  const addCommon = (text: string) => {
    const clean = text.slice(0, TAG_IT_LIMITS.maxTagChars);
    setCommonTags((prev) =>
      prev.some((x) => chipId(x) === chipId(clean)) ? prev : [...prev, clean],
    );
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "done"
          ? { ...f, chips: applyCommonTags(f.chips, [clean]) }
          : f,
      ),
    );
  };

  const removeCommon = (text: string) => {
    const id = chipId(text);
    setCommonTags((prev) => prev.filter((x) => chipId(x) !== id));
    setFiles((prev) =>
      prev.map((f) => ({ ...f, chips: f.chips.filter((c) => c.id !== id) })),
    );
  };

  // ── 다운로드 ───────────────────────────────────────────────────────
  const downloadOne = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (!file || file.status !== "done") return;
    const out = writeKeywords(unzipDocx(file.bytes), finalTags(file.chips));
    triggerDownload(out, file.name, DOCX_MIME);
  };

  const downloadAll = () => {
    const built = doneFiles.map((f) => ({
      name: f.name,
      bytes: writeKeywords(unzipDocx(f.bytes), finalTags(f.chips)),
    }));
    if (built.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(zipFiles(built), `tag-it-${date}.zip`, "application/zip");
  };

  const atFileLimit = files.length >= TAG_IT_LIMITS.maxFiles;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 pt-6 pb-20">
      <div className="mb-4">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t.toolCommon.back}
        </Link>
      </div>

      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {tt.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{tt.description}</p>
      </header>

      {/* ① 입력 흐름 — 절제된 진입점 */}
      <div className="space-y-5">
        <UploadZone
          onSelect={handleSelect}
          warning={warning}
          disabled={atFileLimit}
          labels={{
            title: tt.uploadTitle,
            hint: tt.uploadHint,
            button: tt.uploadButton,
          }}
        />

        {/* ② 추출 설정 — 접힘 기본(강도·범위·최소빈도). 모드는 여기 두지 않음. */}
        <AdvancedPanel
          options={options}
          onChange={(o) => {
            setOptions(o);
            pulseUpdated();
          }}
          labels={{
            advancedTitle: tt.advancedTitle,
            strengthLabel: tt.strengthLabel,
            strengthHint: tt.strengthHint,
            strengthNames: tt.strengthNames,
            strengthDescs: tt.strengthDescs,
            scopeLabel: tt.scopeLabel,
            scopeBody: tt.scopeBody,
            scopeTables: tt.scopeTables,
            minFreqLabel: tt.minFreqLabel,
            minFreqHint: tt.minFreqHint,
          }}
        />

        {/* ③ 주 작업공간 — 화면 주인공. 상시 노출, 모드 세그먼트가 칩 바로 위. */}
        <section className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {tt.workspaceTitle}
              </h2>
              <span
                aria-live="polite"
                className={cn(
                  "text-xs text-primary transition-opacity duration-300",
                  justUpdated ? "opacity-100" : "opacity-0",
                )}
              >
                {tt.reextracted}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {tt.modeLabel}
              </span>
              <Segmented<Mode>
                ariaLabel={tt.modeLabel}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  pulseUpdated();
                }}
                className="w-auto"
                options={[
                  { value: "auto", label: tt.modeAuto },
                  { value: "manual", label: tt.modeManual },
                ]}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "auto" ? tt.modeAutoHint : tt.modeManualHint}
          </p>

          {files.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/40 px-4 py-12 text-center text-sm text-muted-foreground">
              {tt.workspaceEmpty}
            </div>
          ) : (
            <>
              <CommonTray
                tags={commonTags}
                onAdd={addCommon}
                onRemove={removeCommon}
                disabled={doneFiles.length === 0}
                labels={{
                  title: tt.commonTrayTitle,
                  hint: tt.commonTrayHint,
                  placeholder: tt.commonTrayPlaceholder,
                  empty: tt.commonTrayEmpty,
                  remove: tt.chipDelete,
                }}
              />

            <div className="space-y-3">
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  capWarning={capNotes[file.id] ?? null}
                  onToggleSelect={(cid) => toggleSelect(file.id, cid)}
                  onDelete={(cid) => deleteChip(file.id, cid)}
                  onAddManual={(text) => addManual(file.id, text)}
                  onSelectAll={() => selectAll(file.id)}
                  onDeselectAll={() => deselectAll(file.id)}
                  onSelectTop={(n) => selectTop(file.id, n)}
                  onDownload={() => downloadOne(file.id)}
                  labels={{
                    statusPending: tt.statusPending,
                    statusProcessing: tt.statusProcessing,
                    statusDone: tt.statusDone,
                    statusError: tt.statusError,
                    addPlaceholder: tt.addPlaceholder,
                    showMore: tt.showMore,
                    showLess: tt.showLess,
                    download: tt.download,
                    counter: tt.counter,
                    emptyCanvas: tt.emptyCanvas,
                    chipSelect: tt.chipSelect,
                    chipDelete: tt.chipDelete,
                    freqTitle: tt.freqTitle,
                    sectionSelected: tt.sectionSelected,
                    sectionCandidate: tt.sectionCandidate,
                    selectedEmpty: tt.selectedEmpty,
                    candidateAllAdded: tt.candidateAllAdded,
                    searchPlaceholder: tt.searchPlaceholder,
                    searchEmpty: tt.searchEmpty,
                    selectAll: tt.selectAll,
                    deselectAll: tt.deselectAll,
                    selectTop: tt.selectTop,
                    topNAria: tt.topNAria,
                  }}
                />
              ))}
            </div>

            {doneFiles.length > 1 && (
              <button
                type="button"
                onClick={downloadAll}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Download className="size-4" />
                {tt.downloadAll}
              </button>
            )}

              <p className="text-xs text-muted-foreground">
                {tt.overwriteNote}
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/** 공통 태그를 칩 목록에 selected로 합류 (중복은 selected로 승격). */
function applyCommonTags(chips: Chip[], commonTags: string[]): Chip[] {
  let next = chips;
  for (const tag of commonTags) {
    const id = chipId(tag);
    const exists = next.find((c) => c.id === id);
    if (exists) {
      next = next.map((c) =>
        c.id === id ? { ...c, status: "selected" } : c,
      );
    } else {
      next = [
        {
          id,
          text: tag.slice(0, TAG_IT_LIMITS.maxTagChars),
          status: "selected",
          score: 0,
          freq: 0,
          source: "manual",
        },
        ...next,
      ];
    }
  }
  return next;
}
