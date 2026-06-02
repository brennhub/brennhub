/**
 * Pointer events 기반 드래그 정렬 hook — 의존성 0. 카드 전체가 드래그 영역.
 *
 * 활성 조건 (클릭/스크롤과 충돌 차단):
 *   - mouse: pointerdown 후 dx 또는 dy >= MOUSE_THRESHOLD_PX (5px)
 *   - touch: pointerdown 후 TOUCH_LONG_PRESS_MS (300ms) 경과 (move 무관) — 이후 자유 이동
 *
 * 활성 전엔 navigation 정상(Link 클릭 OK), touch-action: auto (수직 스크롤 정상).
 * 활성 후엔 navigation 차단 + touch-action: none.
 *
 * 사용:
 *   const sort = useSortable({ itemCount, onReorder });
 *   <li data-sort-index={i}><Link {...sort.itemProps(i)}>...</Link></li>
 *   {sort.draggingIndex !== null && <Preview pos={sort.previewPos} ... />}
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MOUSE_THRESHOLD_PX = 5;
const TOUCH_LONG_PRESS_MS = 300;

type Options = {
  itemCount: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

type ItemProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  onClickCapture: (e: React.MouseEvent<HTMLElement>) => void;
  style: React.CSSProperties;
};

export type PreviewPos = { x: number; y: number } | null;

export type SortableHandle = {
  draggingIndex: number | null;
  overIndex: number | null;
  previewPos: PreviewPos;
  isDragging: (index: number) => boolean;
  isOver: (index: number) => boolean;
  itemProps: (index: number) => ItemProps;
};

type PendingState = {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  pointerType: string;
  longPressTimer: number | null;
  target: HTMLElement;
};

export function useSortable({ itemCount, onReorder }: Options): SortableHandle {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [previewPos, setPreviewPos] = useState<PreviewPos>(null);
  // 드래그 활성됐었는지 — pointerup 후 click 차단 결정에 사용 (한 tick 유지).
  const justDraggedRef = useRef(false);
  // 동기적 활성 상태 — useState는 비동기, handler 안에서는 ref 사용으로
  // stale closure 회피.
  const draggingRef = useRef<number | null>(null);
  const overRef = useRef<number | null>(null);

  const pendingRef = useRef<PendingState | null>(null);

  const clearPending = useCallback(() => {
    const p = pendingRef.current;
    if (p?.longPressTimer !== null && p?.longPressTimer !== undefined) {
      window.clearTimeout(p.longPressTimer);
    }
    pendingRef.current = null;
  }, []);

  const activate = useCallback(
    (clientX: number, clientY: number) => {
      const p = pendingRef.current;
      if (!p) return;
      // pointer capture는 pointerdown 시점에 이미 호출됨 — 중복 호출 X.
      draggingRef.current = p.index;
      overRef.current = p.index;
      setDraggingIndex(p.index);
      setOverIndex(p.index);
      setPreviewPos({ x: clientX, y: clientY });
    },
    [],
  );

  const handleDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLElement>) => {
      if (itemCount <= 1) return;
      // 우측 버튼/멀티 터치 무시
      if (e.button !== undefined && e.button !== 0) return;

      const target = e.currentTarget as HTMLElement;
      const pointerType = e.pointerType || "mouse";

      // ★ <a> element의 native HTML5 drag 차단 — 안 막으면 브라우저가 link URL
      //   drag 모드로 전환하고 pointermove/up이 우리 handler에 안 옴.
      e.preventDefault();

      // 안전망: 이전 드래그가 정리 안 된 채 들어왔으면 정리.
      if (draggingRef.current !== null) {
        draggingRef.current = null;
        overRef.current = null;
        setDraggingIndex(null);
        setOverIndex(null);
        setPreviewPos(null);
      }
      clearPending();

      // ★ 핵심: pointerdown 즉시 setPointerCapture — pointer가 element 밖
      //   으로 빠져도 move/up 이벤트가 같은 element에 발화 보장.
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      const pending: PendingState = {
        index,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        pointerType,
        longPressTimer: null,
        target,
      };

      // 터치 — long-press 타이머. 이동 무관, 시간 경과 시 활성.
      if (pointerType === "touch") {
        pending.longPressTimer = window.setTimeout(() => {
          // 시작 좌표에서 활성 (그 사이 move가 없었으면)
          if (pendingRef.current === pending && draggingRef.current === null) {
            activate(pending.startX, pending.startY);
          }
        }, TOUCH_LONG_PRESS_MS);
      }


      pendingRef.current = pending;
    },
    [itemCount, activate, clearPending],
  );

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const p = pendingRef.current;
      // 활성 후 — 프리뷰 좌표 update + over 검출 (ref로 동기 체크).
      if (draggingRef.current !== null) {
        setPreviewPos({ x: e.clientX, y: e.clientY });
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const item = (el as Element | null)?.closest("[data-sort-index]");
        if (item) {
          const attr = (item as HTMLElement).dataset.sortIndex;
          if (attr !== undefined) {
            const idx = parseInt(attr, 10);
            if (!Number.isNaN(idx) && idx >= 0 && idx < itemCount) {
              if (overRef.current !== idx) {
                overRef.current = idx;
                setOverIndex(idx);
              }
            }
          }
        }
        return;
      }

      // 활성 전 — mouse만 threshold 검사. touch는 long-press가 결정.
      if (!p) return;
      if (p.pointerType !== "mouse") return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (Math.abs(dx) >= MOUSE_THRESHOLD_PX || Math.abs(dy) >= MOUSE_THRESHOLD_PX) {
        activate(e.clientX, e.clientY);
      }
    },
    [itemCount, activate],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const p = pendingRef.current;
      if (draggingRef.current !== null) {
        // 드래그 활성 상태 — reorder (ref로 동기 체크).
        const from = draggingRef.current;
        const to = overRef.current;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        draggingRef.current = null;
        overRef.current = null;
        setDraggingIndex(null);
        setOverIndex(null);
        setPreviewPos(null);
        clearPending();
        justDraggedRef.current = true;
        // 다음 tick에 클리어 — 같은 이벤트 chain의 click 차단 끝나면.
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 0);
        if (to !== null && to !== from) {
          onReorder(from, to);
        }
        return;
      }
      // 비활성 — pending만 정리 (정상 click은 그대로 발생).
      if (p) clearPending();
    },
    [onReorder, clearPending],
  );

  // 페이지 떠나면 정리.
  useEffect(() => {
    return () => {
      clearPending();
    };
  }, [clearPending]);

  // 클릭 차단 — 드래그 직후 발생하는 click 이벤트는 navigation 막음.
  const handleClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (justDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const itemProps = useCallback(
    (index: number): ItemProps => ({
      onPointerDown: handleDown(index),
      onPointerMove: handleMove,
      onPointerUp: handleUp,
      onPointerCancel: handleUp,
      onClickCapture: handleClickCapture,
      style: {
        // 활성 후엔 touch-action: none으로 스크롤 차단. 활성 전엔 정상.
        touchAction: draggingIndex !== null ? "none" : undefined,
        userSelect: draggingIndex !== null ? "none" : undefined,
      },
    }),
    [handleDown, handleMove, handleUp, handleClickCapture, draggingIndex],
  );

  const isDragging = useCallback(
    (index: number) => draggingIndex === index,
    [draggingIndex],
  );
  const isOver = useCallback(
    (index: number) => overIndex === index && draggingIndex !== null,
    [overIndex, draggingIndex],
  );

  return {
    draggingIndex,
    overIndex,
    previewPos,
    isDragging,
    isOver,
    itemProps,
  };
}
