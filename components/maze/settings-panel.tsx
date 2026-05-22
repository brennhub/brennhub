"use client";

import { NumberStepper } from "@/components/number-stepper";
import { Switch } from "@/components/switch";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";
import { FOG_RADIUS, SIZES, type MazeSize } from "@/lib/maze/types";

type Props = {
  size: MazeSize;
  fogOfWar: boolean;
  fogRadius: number;
  onSizeChange: (size: MazeSize) => void;
  onFogToggle: (on: boolean) => void;
  onFogRadiusChange: (radius: number) => void;
  onStart: () => void;
};

/** Step1 설정 — 맵 크기 / Fog of War / 시야 반경. */
export function SettingsPanel({
  size,
  fogOfWar,
  fogRadius,
  onSizeChange,
  onFogToggle,
  onFogRadiusChange,
  onStart,
}: Props) {
  const t = useMessages().maze;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.settingsIntro}</p>

      {/* 맵 크기 — 그리기 시작 후 잠김. */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">
          {t.sizeLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map((s) => (
            <Button
              key={s}
              type="button"
              variant={s === size ? "default" : "outline"}
              size="sm"
              onClick={() => onSizeChange(s)}
            >
              {s}×{s}
            </Button>
          ))}
        </div>
      </div>

      {/* Fog of War + 시야 반경. */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label
              htmlFor="maze-fog"
              className="text-sm font-medium text-foreground"
            >
              {t.fogLabel}
            </label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t.fogDescription}
            </p>
          </div>
          <Switch
            id="maze-fog"
            checked={fogOfWar}
            onCheckedChange={onFogToggle}
            aria-label={t.fogLabel}
          />
        </div>
        {fogOfWar && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <label htmlFor="maze-fog-radius" className="text-sm text-foreground">
              {t.fogRadiusLabel}
            </label>
            <div className="w-24">
              <NumberStepper
                id="maze-fog-radius"
                value={String(fogRadius)}
                showBigStep={false}
                smallStep={1}
                bigStep={1}
                min={FOG_RADIUS.MIN}
                max={FOG_RADIUS.MAX}
                inputMode="numeric"
                aria-label={t.fogRadiusLabel}
                maxReachedMessage={t.fogRadiusMax}
                minReachedMessage={t.fogRadiusMin}
                onStep={(n) => onFogRadiusChange(n)}
                onInputChange={(txt) => {
                  const n = parseInt(txt, 10);
                  if (Number.isFinite(n)) {
                    onFogRadiusChange(
                      Math.min(FOG_RADIUS.MAX, Math.max(FOG_RADIUS.MIN, n)),
                    );
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      <Button type="button" onClick={onStart}>
        {t.startButton}
      </Button>
    </div>
  );
}
