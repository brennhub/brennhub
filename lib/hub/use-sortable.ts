/**
 * Pointer events 기반 드래그 정렬 hook — 의존성 0.
 *
 * 사용:
 *   const sort = useSortable({ itemCount: list.length, onReorder });
 *   <li data-sort-index={i} className={sort.isDragging(i) ? "opacity-50" : ""}>
 *     ...
 *     <button {...sort.handleProps(i)} aria-label="...">
 *       <GripVertical />
 *     </button>
 *   </li>
 *
 * - 핸들 element에 touch-action: none (스크롤 충돌 방지 — 핸들 영역만).
 * - pointerdown 시 setPointerCapture로 동일 핸들에서 move/up 추적.
 * - elementFromPoint로 hover 된 sort item 인덱스 검출 → visual swap.
 * - pointerup 시 onReorder(from, to) 1회 호출 (D1 PUT 타이밍 = drop).
 * - drag 중인 카드 본문 클릭 navigation 방지 = pointerdown stopPropagation + preventDefault.
 *
 * 모바일: pointer events 통합 — touch/mouse 동일 코드. 핸들에만 touch-action: none이라
 * 긴 목록 스크롤은 카드 본문에서 정상.
 */

import { useCallback, useState } from "react";

type Options = {
  itemCount: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

type HandleProps = {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
  style: { touchAction: "none" };
};

export type SortableHandle = {
  draggingIndex: number | null;
  overIndex: number | null;
  isDragging: (index: number) => boolean;
  isOver: (index: number) => boolean;
  handleProps: (index: number) => HandleProps;
};

export function useSortable({ itemCount, onReorder }: Options): SortableHandle {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDown = useCallback(
    (index: number) => (e: React.PointerEvent<HTMLElement>) => {
      if (itemCount <= 1) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // 캡처 실패 — pointer 추적은 document 레벨로 fallback (브라우저 기본)
      }
      setDraggingIndex(index);
      setOverIndex(index);
    },
    [itemCount],
  );

  const handleMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (draggingIndex === null) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el) return;
      const item = (el as Element).closest("[data-sort-index]");
      if (!item) return;
      const attr = (item as HTMLElement).dataset.sortIndex;
      if (!attr) return;
      const idx = parseInt(attr, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= itemCount) return;
      setOverIndex((prev) => (prev === idx ? prev : idx));
    },
    [draggingIndex, itemCount],
  );

  const handleUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (draggingIndex === null) return;
      const target = e.currentTarget as HTMLElement;
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      const from = draggingIndex;
      const to = overIndex;
      setDraggingIndex(null);
      setOverIndex(null);
      if (to !== null && to !== from) {
        onReorder(from, to);
      }
    },
    [draggingIndex, overIndex, onReorder],
  );

  const handleProps = useCallback(
    (index: number): HandleProps => ({
      onPointerDown: handleDown(index),
      onPointerMove: handleMove,
      onPointerUp: handleUp,
      onPointerCancel: handleUp,
      style: { touchAction: "none" as const },
    }),
    [handleDown, handleMove, handleUp],
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
    isDragging,
    isOver,
    handleProps,
  };
}
