import type { Intent } from "../types";
import { emptyIntent, type InputController } from "./types";

/**
 * 터치 입력 — 캔버스 좌/우 2-zone hold. fire는 auto-fire(항상 true).
 *
 * pointerdown 시 x로 좌/우 결정 → pointerup/cancel/leave에서 해제.
 * 다중 터치 OK (좌·우 동시 hold 가능, 마지막 이동 우선).
 */
export class TouchInput implements InputController {
  private intent: Intent = { moveLeft: false, moveRight: false, fire: true };
  private active = new Map<number, "left" | "right">();
  private target: HTMLElement | null = null;

  constructor(targetGetter: () => HTMLElement | null) {
    this.getTarget = targetGetter;
  }

  private getTarget: () => HTMLElement | null;

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const el = this.target;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    this.active.set(e.pointerId, side);
    this.recompute();
    e.preventDefault();
  };

  private onPointerEnd = (e: PointerEvent) => {
    if (this.active.delete(e.pointerId)) {
      this.recompute();
    }
  };

  private recompute(): void {
    let left = false;
    let right = false;
    for (const side of this.active.values()) {
      if (side === "left") left = true;
      else right = true;
    }
    this.intent.moveLeft = left;
    this.intent.moveRight = right;
    // fire는 항상 true (auto-fire 정책).
  }

  start(): void {
    const el = this.getTarget();
    if (!el) return;
    this.target = el;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointerup", this.onPointerEnd);
    el.addEventListener("pointercancel", this.onPointerEnd);
    el.addEventListener("pointerleave", this.onPointerEnd);
  }

  stop(): void {
    const el = this.target;
    if (el) {
      el.removeEventListener("pointerdown", this.onPointerDown);
      el.removeEventListener("pointerup", this.onPointerEnd);
      el.removeEventListener("pointercancel", this.onPointerEnd);
      el.removeEventListener("pointerleave", this.onPointerEnd);
    }
    this.target = null;
    this.active.clear();
    this.intent = emptyIntent();
  }

  getIntent(): Intent {
    return { ...this.intent };
  }
}
