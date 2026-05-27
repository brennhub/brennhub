/**
 * PoC: state HMAC encode/decode + tamper 방어.
 * 실행: `npx tsx poc/auth/state.test.ts`
 */

import { createState, verifyState } from "@/lib/auth/state";

const SECRET = "test-secret-32-byte-hex-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

async function main() {
  let pass = 0;
  let fail = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) {
      console.log(`  ✓ ${name}`);
      pass++;
    } else {
      console.log(`  ✗ ${name}`);
      fail++;
    }
  };

  console.log("=== state HMAC PoC ===");

  // 1. round-trip
  const { state, nonce, csrf } = await createState(SECRET, "/somewhere");
  const r1 = await verifyState(SECRET, state);
  check("정상 round-trip ok", r1.ok === true);
  if (r1.ok) {
    check("nonce 일치", r1.payload.nonce === nonce);
    check("csrf 일치", r1.payload.csrf === csrf);
    check("returnTo 일치", r1.payload.returnTo === "/somewhere");
  }

  // 2. tampered payload
  const dot = state.indexOf(".");
  const tamperedPayload = "x" + state.slice(1);
  const r2 = await verifyState(SECRET, tamperedPayload);
  check("tampered payload reject", r2.ok === false && r2.code === "state_invalid");

  // 3. tampered signature
  const tamperedSig = state.slice(0, dot + 1) + "X" + state.slice(dot + 2);
  const r3 = await verifyState(SECRET, tamperedSig);
  check("tampered sig reject", r3.ok === false && r3.code === "state_invalid");

  // 4. wrong secret
  const r4 = await verifyState("different-secret", state);
  check("wrong secret reject", r4.ok === false && r4.code === "state_invalid");

  // 5. malformed (no dot)
  const r5 = await verifyState(SECRET, "nodothere");
  check("malformed (no dot) reject", r5.ok === false && r5.code === "state_invalid");

  // 6. open redirect 방어 — createState도 safeReturnTo 적용
  const evil = await createState(SECRET, "//evil.com");
  const r6 = await verifyState(SECRET, evil.state);
  check(
    "open redirect protocol-relative 차단 (createState 단계)",
    r6.ok === true && r6.payload.returnTo === "/",
  );

  console.log(`\n${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
