"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TAG_IT_LIMITS } from "@/lib/tag-it/limits";

type Props = {
  tags: string[];
  onAdd: (text: string) => void;
  onRemove: (text: string) => void;
  disabled?: boolean;
  labels: {
    title: string;
    hint: string;
    placeholder: string;
    empty: string;
    remove: string;
  };
};

/**
 * 공통 태그 트레이 (기획서 §6.2 상단). 한 번 입력 → 전 파일 카드에 자동 적용.
 * 개별 파일에서의 해제는 각 카드에서 (여기 제거는 모든 파일에서 제거).
 */
export function CommonTray({
  tags,
  onAdd,
  onRemove,
  disabled,
  labels,
}: Props) {
  const [value, setValue] = useState("");

  const commit = () => {
    const text = value.trim().slice(0, TAG_IT_LIMITS.maxTagChars);
    if (!text) return;
    onAdd(text);
    setValue("");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{labels.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{labels.hint}</p>

      <input
        type="text"
        value={value}
        disabled={disabled}
        maxLength={TAG_IT_LIMITS.maxTagChars}
        placeholder={labels.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="mt-3 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-input/30"
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">{labels.empty}</span>
        ) : (
          tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-sm text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(tag)}
                aria-label={`${labels.remove}: ${tag}`}
                className="flex size-4 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
