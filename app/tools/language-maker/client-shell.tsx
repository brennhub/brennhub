"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { SCHEMA_VERSION, type Glyph } from "@/lib/language-maker/types";
import { newGlyph } from "@/lib/language-maker/glyph";
import { loadProject, saveProject } from "@/lib/language-maker/storage";
import { StepNav, type Step } from "@/components/language-maker/step-nav";
import { CharacterGrid } from "@/components/language-maker/character-grid";
import { PixelEditor } from "@/components/language-maker/pixel-editor";
import { Typewriter } from "@/components/language-maker/typewriter";

export function LanguageMakerClientShell() {
  const t = useMessages();
  const tl = t.languageMaker;

  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // hydrate — localStorage에서 문자 컬렉션 로드.
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

  const handleAdd = useCallback(() => {
    const g = newGlyph();
    setGlyphs((prev) => [...prev, g]);
    // 추가 즉시 에디터 열어 바로 그리기.
    setEditingId(g.id);
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

  const handleReorder = useCallback((next: Glyph[]) => {
    setGlyphs(next);
  }, []);

  const goToCharacters = useCallback(() => setStep(1), []);
  const closeEditor = useCallback(() => setEditingId(null), []);

  const editingGlyph = glyphs.find((g) => g.id === editingId) ?? null;

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

      <StepNav step={step} labels={[tl.step1, tl.step2]} onStep={setStep} />

      <div className="mt-6">
        {step === 1 && (
          <CharacterGrid
            glyphs={glyphs}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onTriggerChange={handleTriggerChange}
            onEdit={setEditingId}
            onReorder={handleReorder}
          />
        )}
        {step === 2 && (
          <Typewriter glyphs={glyphs} onGoToSlots={goToCharacters} />
        )}
      </div>

      <PixelEditor
        glyph={editingGlyph}
        onBitmapChange={handleBitmapChange}
        onClose={closeEditor}
      />
    </main>
  );
}
