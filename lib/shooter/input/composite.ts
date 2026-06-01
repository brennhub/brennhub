import type { Intent } from "../types";
import { emptyIntent, orIntent, type InputController } from "./types";

/**
 * 여러 InputController를 OR 합성. start/stop은 전부에 위임.
 * MVP: keyboard + touch 동시 활성.
 */
export class CompositeInput implements InputController {
  constructor(private readonly children: InputController[]) {}

  start(): void {
    for (const c of this.children) c.start();
  }

  stop(): void {
    for (const c of this.children) c.stop();
  }

  getIntent(): Intent {
    return this.children.reduce<Intent>(
      (acc, c) => orIntent(acc, c.getIntent()),
      emptyIntent(),
    );
  }
}
