/**
 * PoC: Google OAuth authorize URL 빌드.
 * 실행: `npx tsx poc/auth/oauth-url.test.ts`
 */

import { buildGoogleAuthorizeUrl } from "@/lib/auth/oauth-url";

function main() {
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

  console.log("=== Google OAuth URL PoC ===");

  const url = buildGoogleAuthorizeUrl({
    clientId: "client-abc.apps.googleusercontent.com",
    redirectUri: "https://dev.brennhub.com/api/auth/google/callback",
    state: "state-xyz.sig-abc",
    nonce: "nonce-1234",
  });

  const u = new URL(url);
  check(
    "host = accounts.google.com",
    u.hostname === "accounts.google.com",
  );
  check("path = /o/oauth2/v2/auth", u.pathname === "/o/oauth2/v2/auth");
  check(
    "client_id 포함",
    u.searchParams.get("client_id") === "client-abc.apps.googleusercontent.com",
  );
  check(
    "redirect_uri 포함",
    u.searchParams.get("redirect_uri") ===
      "https://dev.brennhub.com/api/auth/google/callback",
  );
  check("response_type=code", u.searchParams.get("response_type") === "code");
  check(
    "scope = openid email profile",
    u.searchParams.get("scope") === "openid email profile",
  );
  check(
    "state 정확",
    u.searchParams.get("state") === "state-xyz.sig-abc",
  );
  check("nonce 정확", u.searchParams.get("nonce") === "nonce-1234");
  check(
    "prompt=select_account",
    u.searchParams.get("prompt") === "select_account",
  );

  console.log(`\n${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main();
