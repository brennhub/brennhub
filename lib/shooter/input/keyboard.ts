import type { Intent } from "../types";
import { emptyIntent, type InputController } from "./types";

/**
 * 키보드 입력 — 화살표·WASD·Space.
 * Space는 preventDefault (페이지 스크롤 차단). 화살표도 게임 중엔 preventDefault.
 *
 * 키 hold = intent on, release = off. fire는 hold도 cooldown 게이트로 발사율 결정.
 */
export class KeyboardInput implements InputController {
  private intent: Intent = emptyIntent();
  private onKeyDown = (e: KeyboardEvent) => this.handle(e, true);
  private onKeyUp = (e: KeyboardEvent) => this.handle(e, false);

  start(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  stop(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.intent = emptyIntent();
  }

  getIntent(): Intent {
    return { ...this.intent };
  }

  private handle(e: KeyboardEvent, pressed: boolean): void {
    let matched = true;
    switch (e.key) {
      case "ArrowLeft":
      case "a":
      case "A":
        this.intent.moveLeft = pressed;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        this.intent.moveRight = pressed;
        break;
      case " ":
      case "Spacebar":
        this.intent.fire = pressed;
        break;
      default:
        matched = false;
    }
    if (matched) e.preventDefault();
  }
}
