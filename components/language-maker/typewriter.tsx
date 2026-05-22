"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { GRID_SIZE, type Glyph } from "@/lib/language-maker/types";
import { drawGlyph, tokenize, type Token } from "@/lib/language-maker/glyph";

/** 변환 결과 canvas 논리 너비 — 저장 PNG 너비와 동일. */
const LOGICAL_WIDTH = 512;
const PAD = 16;
/** 글리프 한 칸 표시 크기. */
const CELL = 40;
const GAP = 6;
/** 글리프를 셀 안쪽으로 들이는 여백 — 인접·동일 글리프 경계 구분. */
const GLYPH_INSET = 1.5;

type Props = {
  glyphs: Glyph[];
  onGoToSlots: () => void;
};

/** 스텝 3 — 바벨 타자기. 입력을 매핑 글리프로 실시간 변환 + PNG 저장. */
export function Typewriter({ glyphs, onGoToSlots }: Props) {
  const t = useMessages().languageMaker;
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [input, setInput] = useState("");

  const mappedCount = glyphs.filter((g) => g.trigger.length > 0).length;
  const tokens = useMemo(() => tokenize(input, glyphs), [input, glyphs]);
  const hasOutput = input.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dark = theme === "dark";

    const usable = LOGICAL_WIDTH - PAD * 2;
    const columns = Math.max(1, Math.floor((usable + GAP) / (CELL + GAP)));

    // 토큰 배치 — 줄바꿈(\n) 처리 + 폭 초과 시 자동 줄넘김.
    type Placed = { token: Token; col: number; row: number };
    const placed: Placed[] = [];
    let col = 0;
    let row = 0;
    let maxRow = 0;
    for (const token of tokens) {
      if (token.kind === "literal" && token.char === "\n") {
        col = 0;
        row += 1;
        continue;
      }
      if (col >= columns) {
        col = 0;
        row += 1;
      }
      placed.push({ token, col, row });
      maxRow = Math.max(maxRow, row);
      col += 1;
    }
    const rows = placed.length > 0 ? maxRow + 1 : 1;
    const height = PAD * 2 + rows * CELL + (rows - 1) * GAP;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(LOGICAL_WIDTH * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 배경 — 공유 이미지용 솔리드 (현재 테마 대응).
    ctx.fillStyle = dark ? "#18181b" : "#ffffff";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, height);

    const ink = dark ? "#fafafa" : "#18181b";
    const literalColor = dark ? "#a1a1aa" : "#71717a";
    ctx.font = `${Math.round(CELL * 0.6)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const { token, col: c, row: r } of placed) {
      const x = PAD + c * (CELL + GAP);
      const y = PAD + r * (CELL + GAP);
      if (token.kind === "glyph") {
        // 셀 가장자리에서 GLYPH_INSET만큼 안쪽으로 — 꽉 찬 글리프도 여백 확보.
        drawGlyph(
          ctx,
          token.glyph.bitmap,
          x + GLYPH_INSET,
          y + GLYPH_INSET,
          (CELL - GLYPH_INSET * 2) / GRID_SIZE,
          ink,
        );
      } else if (token.char.trim().length > 0) {
        // 매핑되지 않은 글자 — 회색 원문으로 통과.
        ctx.fillStyle = literalColor;
        ctx.fillText(token.char, x + CELL / 2, y + CELL / 2);
      }
    }
  }, [tokens, theme]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `language-maker-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, []);

  if (mappedCount === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">
          {t.typewriterHeading}
        </h2>
        <p className="mt-5 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {t.typewriterNoGlyph}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onGoToSlots}
        >
          {t.goToSlots}
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground">
        {t.typewriterHeading}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t.typewriterIntro}
      </p>

      <div className="mt-4 flex flex-col gap-1.5">
        <label
          htmlFor="lm-typewriter-input"
          className="text-sm font-medium text-foreground"
        >
          {t.inputLabel}
        </label>
        <textarea
          id="lm-typewriter-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.inputPlaceholder}
          rows={3}
          spellCheck={false}
          className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors hover:border-ring/60 focus:border-ring placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">{t.unmappedNote}</p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            {t.outputLabel}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={!hasOutput}
          >
            <Download />
            {t.download}
          </Button>
        </div>
        {hasOutput ? (
          <canvas
            ref={canvasRef}
            style={{ width: "100%", maxWidth: LOGICAL_WIDTH, height: "auto" }}
            className="mt-2 rounded-md border border-border"
          />
        ) : (
          <p className="mt-2 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {t.typewriterEmpty}
          </p>
        )}
      </div>
    </section>
  );
}
