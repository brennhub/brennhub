"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useMessages } from "@/lib/i18n/provider";
import type { Glyph } from "@/lib/language-maker/types";
import { CharacterCard } from "./character-card";

/** 마우스 드래그 시작 임계값 (px). */
const DRAG_THRESHOLD = 6;
/** 터치 드래그 활성 길게 누르기 시간 (ms). */
const LONG_PRESS_MS = 280;
/** 길게 누르기 전 이 거리 이상 움직이면 스크롤 의도로 간주. */
const TOUCH_SCROLL_TOLERANCE = 10;

type PointerState = {
  id: string;
  pointerId: number;
  element: HTMLElement;
  startX: number;
  startY: number;
  pointerType: string;
  activated: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
};

type Props = {
  glyphs: Glyph[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onTriggerChange: (id: string, trigger: string) => void;
  onEdit: (id: string) => void;
  onReorder: (next: Glyph[]) => void;
};

/** 스텝 1 — 문자 카드 그리드. 클릭=에디터 / 드래그=재정렬 / "+"=추가. */
export function CharacterGrid({
  glyphs,
  onAdd,
  onDelete,
  onTriggerChange,
  onEdit,
  onReorder,
}: Props) {
  const t = useMessages().languageMaker;
  const gridRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<PointerState | null>(null);
  const dragActiveRef = useRef(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // 드래그 활성 중에만 페이지 스크롤 차단 — non-passive touchmove.
  // 활성 전(스크롤 의도)에는 preventDefault하지 않아 스크롤이 정상 동작.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (dragActiveRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  // 같은 트리거를 쓰는 문자 수 — 중복 경고용.
  const triggerCounts = new Map<string, number>();
  for (const g of glyphs) {
    const key = g.trigger.trim();
    if (key) triggerCounts.set(key, (triggerCounts.get(key) ?? 0) + 1);
  }

  const clearState = useCallback(() => {
    const st = pointerRef.current;
    if (st?.longPressTimer) clearTimeout(st.longPressTimer);
    pointerRef.current = null;
    dragActiveRef.current = false;
    setDraggingId(null);
  }, []);

  const activate = useCallback(() => {
    const st = pointerRef.current;
    if (!st || st.activated) return;
    st.activated = true;
    dragActiveRef.current = true;
    try {
      st.element.setPointerCapture(st.pointerId);
    } catch {
      // 캡처 실패는 무시 — 드래그는 계속 동작.
    }
    setDraggingId(st.id);
  }, []);

  const reorderToPoint = useCallback(
    (clientX: number, clientY: number) => {
      const st = pointerRef.current;
      if (!st) return;
      const el = document.elementFromPoint(clientX, clientY);
      const card = el?.closest<HTMLElement>("[data-glyph-id]");
      const targetId = card?.dataset.glyphId;
      if (!targetId || targetId === st.id) return;
      const list = glyphs;
      const from = list.findIndex((g) => g.id === st.id);
      const to = list.findIndex((g) => g.id === targetId);
      if (from === -1 || to === -1 || from === to) return;
      const next = [...list];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onReorder(next);
    },
    [glyphs, onReorder],
  );

  const handlePointerDown = useCallback(
    (id: string, e: React.PointerEvent<HTMLDivElement>) => {
      // 마우스는 좌클릭만.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const st: PointerState = {
        id,
        pointerId: e.pointerId,
        element: e.currentTarget,
        startX: e.clientX,
        startY: e.clientY,
        pointerType: e.pointerType,
        activated: false,
        longPressTimer: null,
      };
      pointerRef.current = st;
      // 터치: 길게 누르면 드래그 활성 (그 전까지는 스크롤 허용).
      if (e.pointerType === "touch") {
        st.longPressTimer = setTimeout(activate, LONG_PRESS_MS);
      }
    },
    [activate],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const st = pointerRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      if (!st.activated) {
        const dist = Math.hypot(e.clientX - st.startX, e.clientY - st.startY);
        if (st.pointerType === "touch") {
          // 길게 누르기 전 이동 = 스크롤 의도 → 드래그 취소.
          if (dist > TOUCH_SCROLL_TOLERANCE) clearState();
        } else if (dist >= DRAG_THRESHOLD) {
          activate();
        }
        return;
      }
      reorderToPoint(e.clientX, e.clientY);
    },
    [activate, reorderToPoint, clearState],
  );

  const handlePointerUp = useCallback(
    (id: string, e: React.PointerEvent<HTMLDivElement>) => {
      const st = pointerRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      const wasDrag = st.activated;
      clearState();
      // 드래그가 아니었으면 클릭/탭 → 에디터 열기.
      if (!wasDrag) onEdit(id);
    },
    [clearState, onEdit],
  );

  const handlePointerCancel = useCallback(() => {
    clearState();
  }, [clearState]);

  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground">{t.gridHeading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.gridIntro}</p>

      <div
        ref={gridRef}
        className="mt-5 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))]"
      >
        {glyphs.map((g, i) => {
          const key = g.trigger.trim();
          const duplicate =
            key.length > 0 && (triggerCounts.get(key) ?? 0) > 1;
          return (
            <CharacterCard
              key={g.id}
              glyph={g}
              index={i}
              duplicate={duplicate}
              dragging={draggingId === g.id}
              onEdit={() => onEdit(g.id)}
              onDelete={() => onDelete(g.id)}
              onTriggerChange={(trigger) => onTriggerChange(g.id, trigger)}
              onPreviewPointerDown={(e) => handlePointerDown(g.id, e)}
              onPreviewPointerMove={handlePointerMove}
              onPreviewPointerUp={(e) => handlePointerUp(g.id, e)}
              onPreviewPointerCancel={handlePointerCancel}
            />
          );
        })}

        {/* 마지막 "+" 카드 — 끝에 문자 추가 */}
        <button
          type="button"
          onClick={onAdd}
          aria-label={t.addCharacter}
          className="flex min-h-[148px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-ring/60 hover:text-foreground"
        >
          <Plus className="size-6" />
          <span className="text-sm font-medium">{t.addCharacter}</span>
        </button>
      </div>
    </section>
  );
}
