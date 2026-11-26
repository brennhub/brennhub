/**
 * Pointer events 기반 드래그 정렬 hook — 의존성 0. 요소 전체가 드래그 영역.
 *
 * 활성 조건 (클릭/스크롤과 충돌 차단):
 *   - mouse: pointerdown 후 dx 또는 dy >= MOUSE_THRESHOLD_PX (5px)
 *   - touch: pointerdown 후 longPressMs 경과 — 이후 자유 이동
 *
 * 활성 전엔 navigation 정상(Link 클릭 OK), touch-action: auto (수직 스크롤 정상).
 * 활성 후엔 navigation 차단 + touch-action: none.
 *
 * 사용:
 *   const sort = useSortable({ itemCount, onReorder });
 *   <li data-sort-index={i}><Link {...sort.itemProps(i)}>...</Link></li>
 *   {sort.draggingIndex !== null && <Preview pos={sort.previewPos} ... />}
 *
 * **선택 인자의 기본값은 전부 "허브 즐겨찾기가 쓰던 동작" 그대로다.** 인자를
 * 넘기지 않으면 이 hook은 lib/hub/use-sortable.ts 시절과 완전히 동일하게 동작한다.
 * 폼처럼 조건이 다른 화면만 필요한 항목을 켠다 (recipe-note 재료 목록).
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MOUSE_THRESHOLD_PX = 5;
const DEFAULT_LONG_PRESS_MS = 300;
/** 기본은 `<button>`만 — 카드 UI에는 이걸로 충분했다. */
const DEFAULT_INTERACTIVE_SELECTOR = "button";

type Options = {
  itemCount: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  /**
   * 이 selector에 걸리는 요소 위에서 시작한 pointerdown은 드래그를 시작하지 않고
   * 즉시 반환한다 (preventDefault도 하지 않음). 폼 컨트롤이 들어 있는 행은
   * `"button, input, select, textarea, label"`처럼 넓혀야 포커스·캐럿·네이티브
   * 드롭다운이 살아난다.
   */
  interactiveSelector?: string;
  /** 터치 long-press 임계 시간(ms). */
  longPressMs?: number;
  /**
   * 지정하면 long-press가 걸리기 **전에** 이 거리(px) 이상 움직였을 때 드래그를
   * 취소한다 = 스크롤 의도로 본다. 미지정이면 이동과 무관하게 시간만으로 활성
   * (기존 동작).
   */
  cancelTouchOnMovePx?: number;
  /**
   * true면 `pointercancel`(시스템 제스처·스크롤 탈취 등)에서 순서를 커밋하지 않고
   * 버린다. 기본값 false는 기존 동작 — 마지막 overIndex로 커밋한다.
   */
  abortOnPointerCancel?: boolean;
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

export function useSortable({
  itemCount,
  onReorder,
  interactiveSelector = DEFAULT_INTERACTIVE_SELECTOR,
  longPressMs = DEFAULT_LONG_PRESS_MS,
  cancelTouchOnMovePx,
  abortOnPointerCancel = false,
}: Options): SortableHandle {
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

      // ★ 인터랙티브 자식 요소(button 등) 위의 pointerdown은 드래그 시작 X.
      //   setPointerCapture가 click target까지 capture된 element로 옮기는
      //   브라우저 동작 때문에, button 클릭이 카드 navigation으로 잡혀버림.
      //   여기서 일찍 return하면 button onClick이 정상 발화 + navigation X.
      const eventTarget = e.target as HTMLElement | null;
      if (eventTarget?.closest(interactiveSelector)) {
        return;
      }

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

      // 터치 — long-press 타이머. 시간 경과 시 활성
      // (cancelTouchOnMovePx를 켜면 그 전에 움직인 만큼 취소된다 — handleMove).
      if (pointerType === "touch") {
        pending.longPressTimer = window.setTimeout(() => {
          // 시작 좌표에서 활성 (그 사이 move가 없었으면)
          if (pendingRef.current === pending && draggingRef.current === null) {
            activate(pending.startX, pending.startY);
          }
        }, longPressMs);
      }


      pendingRef.current = pending;
    },
    [itemCount, activate, clearPending, interactiveSelector, longPressMs],
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
      if (p.pointerType !== "mouse") {
        // 옵트인 시에만: long-press 전 이동 = 스크롤 의도 → 드래그 포기.
        // 미지정이면 기존대로 이동을 무시한다.
        if (cancelTouchOnMovePx !== undefined) {
          const tdx = e.clientX - p.startX;
          const tdy = e.clientY - p.startY;
          if (Math.hypot(tdx, tdy) > cancelTouchOnMovePx) clearPending();
        }
        return;
      }
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (Math.abs(dx) >= MOUSE_THRESHOLD_PX || Math.abs(dy) >= MOUSE_THRESHOLD_PX) {
        activate(e.clientX, e.clientY);
      }
    },
    [itemCount, activate, cancelTouchOnMovePx, clearPending],
  );

  /** `commit: false`면 정리만 하고 순서를 반영하지 않는다 (pointercancel 경로). */
  const finish = useCallback(
    (e: React.PointerEvent<HTMLElement>, commit: boolean) => {
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
        if (commit && to !== null && to !== from) {
          onReorder(from, to);
        }
        return;
      }
      // 비활성 — pending만 정리 (정상 click은 그대로 발생).
      if (p) clearPending();
    },
    [onReorder, clearPending],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => finish(e, true),
    [finish],
  );

  // pointercancel — 기본은 기존 동작(커밋). 옵트인하면 버린다.
  const handleCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => finish(e, !abortOnPointerCancel),
    [finish, abortOnPointerCancel],
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
      onPointerCancel: handleCancel,
      onClickCapture: handleClickCapture,
      style: {
        // 활성 후엔 touch-action: none으로 스크롤 차단. 활성 전엔 정상.
        touchAction: draggingIndex !== null ? "none" : undefined,
        userSelect: draggingIndex !== null ? "none" : undefined,
      },
    }),
    [
      handleDown,
      handleMove,
      handleUp,
      handleCancel,
      handleClickCapture,
      draggingIndex,
    ],
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
