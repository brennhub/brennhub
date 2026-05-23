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
  /**
   * 사이즈 변경 요청 — 통합 화면(0.8.0 P3d)에선 비어있지 않은 그리드면 client-shell이
   * 확인 다이얼로그 분기. 빈 그리드면 즉시 변경. 본 컴포넌트는 단순 콜백만.
   */
  onSizeChange: (size: MazeSize) => void;
  onFogToggle: (on: boolean) => void;
  onFogRadiusChange: (radius: number) => void;
};

/**
 * 사이즈 / Fog of War 설정 패널.
 * 0.8.0(P3d): Step1·Step2 통합으로 "그리기 시작" 버튼·intro 텍스트 제거.
 * 통합 화면에서 그리드 위 고정 높이 row로 상시 노출. props 표현 단순.
 */
export function SettingsPanel({
  size,
  fogOfWar,
  fogRadius,
  onSizeChange,
  onFogToggle,
  onFogRadiusChange,
}: Props) {
  const t = useMessages().maze;

  return (
    <div className="space-y-4">
      {/* 맵 크기. 비어있지 않은 grid에서 변경 시 client-shell이 확인 모달. */}
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
