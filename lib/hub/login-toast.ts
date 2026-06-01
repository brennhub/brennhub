/**
 * 로그인 안내 toast 공통 hook.
 * - button 클릭: toggle (있으면 dismiss, 없으면 show + 2초 timeout)
 * - 외부 클릭 (button 외 영역): 즉시 dismiss
 *
 * 비로그인 차단 인터랙션에서 재사용 (LikeButton / ToolLikeButton / 별표 등).
 */

import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_DISMISS_MS = 2000;

export function useLoginToast() {
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const dismiss = useCallback(() => {
    setVisible(false);
    clearTimer();
  }, []);

  const toggle = useCallback(() => {
    setVisible((prev) => {
      if (prev) {
        clearTimer();
        return false;
      }
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        setVisible(false);
        timerRef.current = null;
      }, AUTO_DISMISS_MS);
      return true;
    });
  }, []);

  // 외부 클릭 dismiss — 현재 클릭이 trigger한 이벤트와 분리 위해 next tick에 등록.
  useEffect(() => {
    if (!visible) return;
    let onDown: ((e: MouseEvent) => void) | null = null;
    const setupId = window.setTimeout(() => {
      onDown = (e: MouseEvent) => {
        if (buttonRef.current?.contains(e.target as Node)) return;
        dismiss();
      };
      document.addEventListener("mousedown", onDown);
    }, 0);
    return () => {
      window.clearTimeout(setupId);
      if (onDown) document.removeEventListener("mousedown", onDown);
    };
  }, [visible, dismiss]);

  // unmount 시 timer 정리
  useEffect(() => {
    return () => clearTimer();
  }, []);

  return { visible, toggle, dismiss, buttonRef };
}
