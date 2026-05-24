import type { Intent } from "../types";

/**
 * 입력 controller — keyboard / touch / composite가 동일 인터페이스로 plug-in.
 * start()는 listener 등록, stop()은 해제, getIntent()는 매 frame 1회 폴링.
 */
export interface InputController {
  start(): void;
  stop(): void;
  getIntent(): Intent;
}

export function emptyIntent(): Intent {
  return { moveLeft: false, moveRight: false, fire: false };
}

export function orIntent(a: Intent, b: Intent): Intent {
  return {
    moveLeft: a.moveLeft || b.moveLeft,
    moveRight: a.moveRight || b.moveRight,
    fire: a.fire || b.fire,
  };
}
