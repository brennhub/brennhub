"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onSelect: (files: File[]) => void;
  /** 한계 초과 등 inline 경고. validity guard: 컴포넌트 unmount 없이 메시지만 swap. */
  warning: string | null;
  disabled?: boolean;
  labels: {
    title: string;
    hint: string;
    button: string;
  };
};

export function UploadZone({ onSelect, warning, disabled, labels }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    onSelect(Array.from(list));
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) pick(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card",
          disabled && "opacity-60",
        )}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{labels.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{labels.hint}</p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed"
        >
          {labels.button}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.xlsx,.pptx"
          multiple
          hidden
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = ""; // 같은 파일 재선택 허용
          }}
        />
      </div>

      {warning && (
        <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {warning}
        </p>
      )}
    </div>
  );
}
