"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberStepper } from "@/components/number-stepper";
import { useMessages } from "@/lib/i18n/provider";
import type { Player } from "@/lib/lineup-builder/types";

const MIN_NUMBER = 1;
const MAX_NUMBER = 99;

type Props = {
  player: Player | null;
  onClose: () => void;
  onSave: (id: number, name: string, number: number) => void;
};

export function EditDialog({ player, onClose, onSave }: Props) {
  const t = useMessages().lineupBuilder;
  const [name, setName] = useState("");
  const [numberDraft, setNumberDraft] = useState("1");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (player) {
      setName(player.name);
      setNumberDraft(String(player.number));
    }
  }, [player]);

  useEffect(() => {
    if (!player) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [player, onClose]);

  if (!player) return null;

  const parsedNumber = Number.parseInt(numberDraft, 10);
  const numberValid =
    Number.isFinite(parsedNumber) &&
    parsedNumber >= MIN_NUMBER &&
    parsedNumber <= MAX_NUMBER;
  const canSave = name.trim().length > 0 && numberValid;

  const handleSave = () => {
    if (!canSave) return;
    onSave(player.id, name.trim(), parsedNumber);
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lineup-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-sm rounded-lg border border-border bg-card text-card-foreground shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 id="lineup-edit-title" className="text-lg font-semibold">
            {t.editTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.editCancel}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="lineup-edit-name" className="text-sm">
              {t.editNameLabel}
            </Label>
            <Input
              id="lineup-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              maxLength={20}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lineup-edit-number" className="text-sm">
              {t.editNumberLabel}
            </Label>
            <NumberStepper
              id="lineup-edit-number"
              value={numberDraft}
              onInputChange={setNumberDraft}
              onStep={(n) => setNumberDraft(String(n))}
              smallStep={1}
              bigStep={10}
              showBigStep={false}
              min={MIN_NUMBER}
              max={MAX_NUMBER}
              inputMode="numeric"
              aria-label={t.editNumberLabel}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t.editCancel}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!canSave}>
            {t.editSave}
          </Button>
        </div>
      </div>
    </div>
  );
}
