/**
 * PoC: ID token RS256 서명 검증 + claims (aud/iss/exp/iat/nonce/email_verified).
 * 자체 RSA keypair 생성해서 Google JWKS 없이 검증 (jwksOverride).
 * 실행: `npx tsx poc/auth/jwt.test.ts`
 */

import { verifyIdToken } from "@/lib/auth/jwt";
import { base64urlEncode, base64urlEncodeString } from "@/lib/auth/base64url";

const AUD = "client-abc.apps.googleusercontent.com";
const NONCE = "nonce-1234";
const SUB = "google-user-sub-12345";

async function generateKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
}

interface Claims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
}

async function signIdToken(
  privKey: CryptoKey,
  kid: string,
  claims: Claims,
): Promise<string> {
  const header = { alg: "RS256", kid, typ: "JWT" };
  const headerB64 = base64urlEncodeString(JSON.stringify(header));
  const payloadB64 = base64urlEncodeString(JSON.stringify(claims));
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privKey, data);
  return `${headerB64}.${payloadB64}.${base64urlEncode(new Uint8Array(sig))}`;
}

function baseClaims(): Claims {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: "https://accounts.google.com",
    aud: AUD,
    sub: SUB,
    exp: now + 3600,
    iat: now - 10,
    nonce: NONCE,
    email: "user@example.com",
    email_verified: true,
    name: "Test User",
  };
}

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

  console.log("=== ID token verify PoC ===");

  const { publicKey, privateKey } = await generateKeyPair();
  const KID = "test-key-1";
  const jwksOverride = async (kid: string) =>
    kid === KID ? publicKey : null;

  // 1. 정상 케이스
  const validToken = await signIdToken(privateKey, KID, baseClaims());
  const r1 = await verifyIdToken(validToken, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check("정상 ID token 통과", r1.ok === true);
  if (r1.ok) {
    check("sub 추출", r1.claims.sub === SUB);
    check("email_verified", r1.claims.email_verified === true);
  }

  // 2. aud 불일치
  const wrongAud = await signIdToken(privateKey, KID, {
    ...baseClaims(),
    aud: "other-client.apps.googleusercontent.com",
  });
  const r2 = await verifyIdToken(wrongAud, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check("aud mismatch reject", r2.ok === false && r2.code === "id_token_invalid");

  // 3. iss 불일치
  const wrongIss = await signIdToken(privateKey, KID, {
    ...baseClaims(),
    iss: "https://evil.com",
  });
  const r3 = await verifyIdToken(wrongIss, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check("iss mismatch reject", r3.ok === false && r3.code === "id_token_invalid");

  // 4. exp 만료
  const expired = await signIdToken(privateKey, KID, {
    ...baseClaims(),
    exp: Math.floor(Date.now() / 1000) - 60,
  });
  const r4 = await verifyIdToken(expired, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check("expired reject", r4.ok === false && r4.code === "id_token_invalid");

  // 5. nonce 불일치
  const wrongNonce = await signIdToken(privateKey, KID, {
    ...baseClaims(),
    nonce: "different-nonce",
  });
  const r5 = await verifyIdToken(wrongNonce, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check("nonce mismatch reject", r5.ok === false && r5.code === "id_token_invalid");

  // 6. email_verified=false
  const unverified = await signIdToken(privateKey, KID, {
    ...baseClaims(),
    email_verified: false,
  });
  const r6 = await verifyIdToken(unverified, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check(
    "email_verified=false reject",
    r6.ok === false && r6.code === "id_token_unverified_email",
  );

  // 7. 서명 위조 (다른 키로 sign)
  const otherKeys = await generateKeyPair();
  const forgedSig = await signIdToken(otherKeys.privateKey, KID, baseClaims());
  const r7 = await verifyIdToken(forgedSig, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride, // 원래 publicKey로 verify → 실패해야 함
  });
  check(
    "서명 위조 reject (다른 키로 sign된 토큰)",
    r7.ok === false && r7.code === "id_token_invalid",
  );

  // 8. kid 미스 (JWKS에 없는 kid)
  const wrongKid = await signIdToken(privateKey, "unknown-kid", baseClaims());
  const r8 = await verifyIdToken(wrongKid, {
    audience: AUD,
    expectedNonce: NONCE,
    jwksOverride,
  });
  check("kid 미스 reject", r8.ok === false && r8.code === "id_token_invalid");

  console.log(`\n${pass} pass / ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
