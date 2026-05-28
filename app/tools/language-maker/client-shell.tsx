"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMessages } from "@/lib/i18n/provider";
import { useCurrentUser } from "@/components/auth/user-provider";
import { SCHEMA_VERSION, type Glyph } from "@/lib/language-maker/types";
import { newGlyph } from "@/lib/language-maker/glyph";
import {
  getLanguageStorage,
  loadProjectForUser,
} from "@/lib/language-maker/storage";
import { StepNav, type Step } from "@/components/language-maker/step-nav";
import { CharacterGrid } from "@/components/language-maker/character-grid";
import { PixelEditor } from "@/components/language-maker/pixel-editor";
import { Typewriter } from "@/components/language-maker/typewriter";

export function LanguageMakerClientShell() {
  const t = useMessages();
  const tl = t.languageMaker;

  const user = useCurrentUser();
  const isLoggedIn = !!user;
  const storage = useMemo(
    () => getLanguageStorage(isLoggedIn),
    [isLoggedIn],
  );

  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  // hydrate — 로그인=D1 / 게스트=localStorage. 로그인 상태 변화 시 재로드.
  // 자동 이전 없음 (게스트/로그인 분리, supp-plan 2-2 정책).
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    loadProjectForUser(isLoggedIn).then(({ data }) => {
      if (cancelled) return;
      setGlyphs(data?.glyphs ?? []);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // persist — hydrate 이후 변경분만 저장 (storage 경유).
  useEffect(() => {
    if (!hydrated) return;
    storage.saveProject({ schemaVersion: SCHEMA_VERSION, glyphs });
  }, [glyphs, hydrated, storage]);

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
