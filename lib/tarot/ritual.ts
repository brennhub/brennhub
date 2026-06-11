/**
 * 의식 플로우 순수 로직 — RNG · 셔플 · 컷 · 봉인 해시 · 방향 결정.
 * 전부 client-side (Web Crypto). 이 도구에서 Math.random 사용 금지.
 */

/**
 * crypto.getRandomValues 기반 + 인터랙션 엔트로피 가미.
 *
 * 정직성 핵심: 균등분포인 crypto word에 임의 값(acc)을 XOR해도 균등분포가
 * 유지된다 — 엔트로피 혼합은 결과를 약화시킬 수 없고, 사용자의 손(좌표·타이밍)이
 * 실제로 결과에 개입한다. acc는 인터랙션 입력만으로 유도되며 crypto 출력과
 * 독립이므로 XOR 결과는 최소한 crypto 수준의 균등성을 보장한다.
 */
export type RitualRng = {
  /** 셔플 드래그·컷 탭의 좌표/타임스탬프를 누적 (Fibonacci hashing stir). */
  mix: (v: number) => void;
  nextUint32: () => number;
  nextBelow: (n: number) => number;
};

export function createRitualRng(): RitualRng {
  let acc = 0;
  let ctr = 0;
  return {
    mix(v) {
      acc = Math.imul((acc ^ v) >>> 0, 0x9e3779b1) >>> 0;
    },
    nextUint32() {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      ctr = (ctr + 0x6d2b79f5) >>> 0;
      return (buf[0] ^ acc ^ ctr) >>> 0;
    },
    // 모듈로 바이어스 < n/2^32 — n <= 22에서 무시 가능 (10억분의 5 수준)
    nextBelow(n) {
      return this.nextUint32() % n;
    },
  };
}

/** Fisher-Yates 1패스. 유효 셔플 제스처 1회당 1패스 적용. */
export function shufflePass(deck: readonly number[], rng: RitualRng): number[] {
  const out = [...deck];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextBelow(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 두 경계(1 <= first < second <= deck.length - 1)로 3더미 분할. index 0 = top. */
export function splitDeck(
  deck: readonly number[],
  first: number,
  second: number,
): [number[], number[], number[]] {
  return [deck.slice(0, first), deck.slice(first, second), deck.slice(second)];
}

/** 탭한 순서대로 재결합 — 먼저 탭한 더미가 top. 선택 순서가 실제 덱 순열을 결정한다. */
export function recombine(
  piles: readonly (readonly number[])[],
  order: readonly number[],
): number[] {
  return order.flatMap((i) => [...piles[i]]);
}

/** 카드별 숨은 방향 비트 — 1 = 역방향. 컷 재결합 순간에만 호출. */
export function drawOrientationBits(rng: RitualRng, n = 22): (0 | 1)[] {
  return Array.from({ length: n }, () => (rng.nextUint32() & 1) as 0 | 1);
}

/** 16바이트 hex nonce. (lib/auth/random.ts randomHex와 동일 패턴 — auth 번들 미수입 위해 자체 구현) */
export function randomNonceHex(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < buf.length; i++) out += buf[i].toString(16).padStart(2, "0");
  return out;
}

/**
 * 봉인 payload 정본 — S8 '검증' 토글(Task 3)이 이 문자열을 재구성해 재해시한다.
 * 포맷 변경 = 검증 호환 깨짐. 변경 금지.
 *   tarot-seal-v1|order:<id,22개>|bits:<0/1 22자>|nonce:<32 hex>
 * bits[k] = deck[k]의 숨은 방향 (1 = 역방향). S6 선택은 포함하지 않는다 —
 * 해시는 "선택 전" 상태의 증명이고, 최종 방향은 bits XOR choice로 계산된다.
 */
export function buildSealPayload(
  deck: readonly number[],
  bits: readonly (0 | 1)[],
  nonce: string,
): string {
  return `tarot-seal-v1|order:${deck.join(",")}|bits:${bits.join("")}|nonce:${nonce}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * ★ 2층 정/역 메커니즘의 코드 정본 — 코드 리뷰 최우선 확인 항목.
 * 최종 방향 = 숨은 비트(S4 고정) XOR 전역 선택(S6).
 * 선택이 숨은 상태를 그대로 보존하거나(정방향) 전부 반전한다(역방향).
 * 단층 '방향 고르기'(선택=결과 직결)로 단순화 금지 — 시그니처가 죽는다.
 */
export function finalOrientation(
  bit: 0 | 1,
  choice: "upright" | "reversed",
): "upright" | "reversed" {
  const reversed = (bit === 1) !== (choice === "reversed");
  return reversed ? "reversed" : "upright";
}
