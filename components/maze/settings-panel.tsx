"use client";

import { NumberStepper } from "@/components/number-stepper";
import { Switch } from "@/components/switch";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";
import { FOG_RADIUS, SIZE_PRESETS } from "@/lib/maze/types";

type Props = {
  width: number;
  height: number;
  fogOfWar: boolean;
  fogRadius: number;
  /**
   * 사이즈 변경 요청 — 통합 화면(0.8.0 P3d)에선 비어있지 않은 그리드면 client-shell이
   * 확인 다이얼로그 분기. 빈 그리드면 즉시 변경. 본 컴포넌트는 단순 콜백만.
   * 0.10.0(Phase A): 정사각 프리셋 버튼은 (s, s)로 W·H 동일 호출.
   * Phase B에서 W·H NumberStepper 추가 시 같은 콜백 재사용.
   */
  onSizeChange: (width: number, height: number) => void;
  onFogToggle: (on: boolean) => void;
  onFogRadiusChange: (radius: number) => void;
};

/**
 * 사이즈 / Fog of War 설정 패널.
 * 0.10.0 Phase A: 내부 모델은 width/height 분리이나 UI는 정사각 프리셋 버튼 유지.
 * Phase B(0.11.0)에서 W·H NumberStepper UI 추가.
 */
export function SettingsPanel({
  width,
  height,
  fogOfWar,
  fogRadius,
  onSizeChange,
  onFogToggle,
  onFogRadiusChange,
}: Props) {
  const t = useMessages().maze;
  const isSquare = width === height;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-sm font-medium text-foreground">
          {t.sizeLabel}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_PRESETS.map((s) => {
            const active = isSquare && width === s;
            return (
              <Button
                key={s}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => onSizeChange(s, s)}
              >
                {s}×{s}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Fog of War + 시야 반경. fog toggle/radius는 grid 영향 0이라 즉시 반영. */}
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
    </div>
  );
}
