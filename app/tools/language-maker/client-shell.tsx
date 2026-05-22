"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { SCHEMA_VERSION, type Glyph } from "@/lib/language-maker/types";
import { newGlyph } from "@/lib/language-maker/glyph";
import { loadProject, saveProject } from "@/lib/language-maker/storage";
import { StepNav, type Step } from "@/components/language-maker/step-nav";
import { SlotPanel } from "@/components/language-maker/slot-panel";
import { PixelEditor } from "@/components/language-maker/pixel-editor";
import { Typewriter } from "@/components/language-maker/typewriter";

export function LanguageMakerClientShell() {
  const t = useMessages();
  const tl = t.languageMaker;

  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // hydrate — localStorage에서 글리프 컬렉션 로드.
  useEffect(() => {
    const project = loadProject();
    setGlyphs(project.glyphs);
    setHydrated(true);
  }, []);

  // persist — hydrate 이후 변경분만 저장.
  useEffect(() => {
    if (!hydrated) return;
    saveProject({ schemaVersion: SCHEMA_VERSION, glyphs });
  }, [glyphs, hydrated]);

  // 스텝 2 진입 시 선택 글리프가 없거나 stale이면 첫 글리프로 보정.
  useEffect(() => {
    if (step !== 2 || glyphs.length === 0) return;
    if (!glyphs.some((g) => g.id === selectedId)) {
      setSelectedId(glyphs[0].id);
    }
  }, [step, glyphs, selectedId]);

  const handleAdd = useCallback(() => {
    setGlyphs((prev) => [...prev, newGlyph()]);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setGlyphs((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const handleTriggerChange = useCallback((id: string, trigger: string) => {
    setGlyphs((prev) =>
      prev.map((g) => (g.id === id ? { ...g, trigger } : g)),
    );
  }, []);

  const handleBitmapChange = useCallback(
    (id: string, update: (prev: boolean[][]) => boolean[][]) => {
      setGlyphs((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, bitmap: update(g.bitmap) } : g,
        ),
      );
    },
    [],
  );

  const handleDraw = useCallback((id: string) => {
    setSelectedId(id);
    setStep(2);
  }, []);

  const goToSlots = useCallback(() => setStep(1), []);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 pt-6 pb-20">
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
          {tl.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{tl.description}</p>
      </header>

      <StepNav
        step={step}
        labels={[tl.step1, tl.step2, tl.step3]}
        onStep={setStep}
      />

      <div className="mt-6">
        {step === 1 && (
          <SlotPanel
            glyphs={glyphs}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onTriggerChange={handleTriggerChange}
            onDraw={handleDraw}
          />
        )}
        {step === 2 && (
          <PixelEditor
            glyphs={glyphs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onBitmapChange={handleBitmapChange}
            onGoToSlots={goToSlots}
          />
        )}
        {step === 3 && (
          <Typewriter glyphs={glyphs} onGoToSlots={goToSlots} />
        )}
      </div>
    </main>
  );
}
