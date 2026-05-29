"use client";

import { useEffect, useRef, useState } from "react";
import { NumberStepper } from "@/components/number-stepper";
import { Switch } from "@/components/switch";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/lib/i18n/provider";
import {
  DIM_MAX,
  DIM_MIN,
  FOG_RADIUS,
  SIZE_PRESETS,
  TIME_LIMIT,
} from "@/lib/maze/types";
import { ZOOM_REFERENCE_SIZE } from "@/lib/maze/viewport";

type Props = {
  width: number;
  height: number;
  fogOfWar: boolean;
  fogRadius: number;
  /** 플레이 시야 거리 (P3e-2 0.12.0) — 캔버스 한 변 보이는 칸 수. [16, max(W,H)]. */
  playViewSpan: number;
  onPlayViewSpanChange: (n: number) => void;
  /** 제한 시간 (P5a 1.1.0) — 초 또는 null(타이머 없음). */
  timeLimitSec: number | null;
  onTimeLimitChange: (n: number | null) => void;
  /**
   * 사이즈 변경 요청. client-shell이 그리드 빈/비어있지 않음 판정 후 즉시 적용 또는
   * 확인 다이얼로그 분기. 본 컴포넌트는 단순 콜백만.
   *
   * Phase B(0.11.0) 호출 경로:
   *   1) 스테퍼 편집 → [적용] 버튼 클릭 → onSizeChange(localW, localH).
   *      스테퍼 +/− 단발마다 다이얼로그 뜨는 것 차단 (사용자 명시 요구).
   *   2) 프리셋 quick-pick → onSizeChange(s, s). 단일 액션이라 즉시.
   */
  onSizeChange: (width: number, height: number) => void;
  onFogToggle: (on: boolean) => void;
  onFogRadiusChange: (radius: number) => void;
};

function clampDim(n: number): number {
  return Math.min(DIM_MAX, Math.max(DIM_MIN, n));
}

/**
 * 사이즈(가로·세로) / Fog of War 설정 패널.
 *
 * Phase B(0.11.0): W·H NumberStepper(`DIM_MIN..DIM_MAX`) + 정사각 프리셋 quick-pick.
 * 스테퍼는 local pending state로 편집 — [적용] 버튼이 명시 확정. 비어있지 않은 그리드면
 * client-shell이 ResetConfirmDialog로 분기 (변경 1회당 다이얼로그 1회).
 */
export function SettingsPanel({
  width,
  height,
  fogOfWar,
  fogRadius,
  playViewSpan,
  onPlayViewSpanChange,
  timeLimitSec,
  onTimeLimitChange,
  onSizeChange,
  onFogToggle,
  onFogRadiusChange,
}: Props) {
  const t = useMessages().maze;

  // 스테퍼 pending 값 — 부모 width/height와 분리. 적용 전엔 grid에 영향 0.
  const [localW, setLocalW] = useState(width);
  const [localH, setLocalH] = useState(height);

  // 제한 시간 toggle on/off 시 직전 값 캐시 — off→on 복원에 사용.
  // timeLimitSec가 number면 직접 ref 동기화 (사용자 입력값 추적).
  const lastTimeLimitRef = useRef<number>(timeLimitSec ?? TIME_LIMIT.DEFAULT);
  useEffect(() => {
    if (timeLimitSec !== null) lastTimeLimitRef.current = timeLimitSec;
  }, [timeLimitSec]);

  const handleTimeLimitToggle = (on: boolean) => {
    if (on) {
      onTimeLimitChange(lastTimeLimitRef.current);
    } else {
      onTimeLimitChange(null);
    }
  };

  const handleTimeLimitValueChange = (n: number) => {
    const clamped = Math.min(TIME_LIMIT.MAX, Math.max(TIME_LIMIT.MIN, n));
    onTimeLimitChange(clamped);
  };

  // 부모 값이 외부에서 바뀌면(프리셋 클릭, undo 등) 스테퍼 동기화.
  useEffect(() => setLocalW(width), [width]);
  useEffect(() => setLocalH(height), [height]);

  const isSquare = width === height;
  const hasPendingChange = localW !== width || localH !== height;

  const handleApply = () => {
    if (!hasPendingChange) return;
    onSizeChange(localW, localH);
  };

  return (
    <div className="space-y-4">
      {/* 가로·세로 스테퍼 + 적용. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            htmlFor="maze-width"
            className="block text-sm font-medium text-foreground"
          >
            {t.widthLabel}
          </label>
          <div className="w-28">
            <NumberStepper
              id="maze-width"
              value={String(localW)}
              showBigStep={false}
              smallStep={1}
              bigStep={1}
              min={DIM_MIN}
              max={DIM_MAX}
              inputMode="numeric"
              aria-label={t.widthLabel}
              maxReachedMessage={t.dimMaxReached}
              minReachedMessage={t.dimMinReached}
              onStep={(n) => setLocalW(clampDim(n))}
              onInputChange={(txt) => {
                const n = parseInt(txt, 10);
                if (Number.isFinite(n)) setLocalW(clampDim(n));
              }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="maze-height"
            className="block text-sm font-medium text-foreground"
          >
            {t.heightLabel}
          </label>
          <div className="w-28">
            <NumberStepper
              id="maze-height"
              value={String(localH)}
              showBigStep={false}
              smallStep={1}
              bigStep={1}
              min={DIM_MIN}
              max={DIM_MAX}
              inputMode="numeric"
              aria-label={t.heightLabel}
              maxReachedMessage={t.dimMaxReached}
              minReachedMessage={t.dimMinReached}
              onStep={(n) => setLocalH(clampDim(n))}
              onInputChange={(txt) => {
                const n = parseInt(txt, 10);
                if (Number.isFinite(n)) setLocalH(clampDim(n));
              }}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!hasPendingChange}
          onClick={handleApply}
        >
          {t.applySize}
        </Button>
      </div>

      {/* 정사각 프리셋 quick-pick — 클릭이 한 변경이라 즉시 onSizeChange. */}
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">{t.presetsLabel}</span>
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

      {/* Fog of War + 시야 반경 (0.10.1 같은 row) + 플레이 시야 거리 (P3e-2 별도 row).
          둘 다 "플레이 시 보이는 방식" 설정이라 한 카드. */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
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
          {fogOfWar && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="maze-fog-radius"
                className="text-sm text-foreground"
              >
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

        {/* 플레이 시야 거리 — max(W,H) ≤ 16(줌 의미 0)이면 row 자체 미렌더. */}
        {Math.max(width, height) > ZOOM_REFERENCE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <label
              htmlFor="maze-play-view-span"
              className="text-sm font-medium text-foreground"
            >
              {t.playViewSpanLabel}
            </label>
            <div className="w-28">
              <NumberStepper
                id="maze-play-view-span"
                value={String(playViewSpan)}
                showBigStep={false}
                smallStep={1}
                bigStep={1}
                min={ZOOM_REFERENCE_SIZE}
                max={Math.max(width, height)}
                inputMode="numeric"
                aria-label={t.playViewSpanLabel}
                maxReachedMessage={t.playViewSpanMax}
                minReachedMessage={t.playViewSpanMin}
                onStep={(n) => onPlayViewSpanChange(n)}
                onInputChange={(txt) => {
                  const n = parseInt(txt, 10);
                  if (Number.isFinite(n)) {
                    const lo = ZOOM_REFERENCE_SIZE;
                    const hi = Math.max(width, height);
                    onPlayViewSpanChange(Math.min(hi, Math.max(lo, n)));
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 시간 제한 (P5a 1.1.0) — 별도 카드. toggle off면 stepper 미렌더.
          toggle on/off 시 lastTimeLimitRef로 직전 값 캐시·복원. */}
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="maze-time-limit"
              className="text-sm font-medium text-foreground"
            >
              {t.timeLimitLabel}
            </label>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t.timeLimitDescription}
            </p>
          </div>
          <Switch
            id="maze-time-limit"
            checked={timeLimitSec !== null}
            onCheckedChange={handleTimeLimitToggle}
            aria-label={t.timeLimitLabel}
          />
          {timeLimitSec !== null && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="maze-time-limit-value"
                className="text-sm text-foreground"
              >
                {t.timeLimitValueLabel}
              </label>
              <div className="w-28">
                <NumberStepper
                  id="maze-time-limit-value"
                  value={String(timeLimitSec)}
                  smallStep={10}
                  bigStep={60}
                  min={TIME_LIMIT.MIN}
                  max={TIME_LIMIT.MAX}
                  inputMode="numeric"
                  aria-label={t.timeLimitValueLabel}
                  maxReachedMessage={t.timeLimitMaxReached}
                  minReachedMessage={t.timeLimitMinReached}
                  onStep={(n) => handleTimeLimitValueChange(n)}
                  onInputChange={(txt) => {
                    const n = parseInt(txt, 10);
                    if (Number.isFinite(n)) handleTimeLimitValueChange(n);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
