/**
 * Google JWKS 캐시.
 * - TTL 12h (Google rotation 주기 ~24h, 50% 여유).
 * - kid 미스 시 1회 강제 refetch (rotation 직후 시나리오).
 * - refetch는 throttle: 60초 내 1회 max (abuse 가드).
 *
 * 모듈 레벨 Map — Worker 인스턴스 수명 동안 유지.
 */

const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const TTL_MS = 12 * 60 * 60 * 1000;
const REFETCH_THROTTLE_MS = 60 * 1000;

interface JsonWebKey {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

interface Cache {
  keys: Map<string, CryptoKey>;
  fetchedAt: number;
  lastRefetchAt: number;
}

const cache: Cache = {
  keys: new Map(),
  fetchedAt: 0,
  lastRefetchAt: 0,
};

async function importRsaKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    jwk as unknown as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

async function refetch(): Promise<void> {
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`jwks_fetch_failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: JsonWebKey[] };
  const next = new Map<string, CryptoKey>();
  for (const k of keys) {
    if (k.kty !== "RSA" || !k.kid) continue;
    try {
      next.set(k.kid, await importRsaKey(k));
    } catch {
      // skip malformed key
    }
  }
  cache.keys = next;
  cache.fetchedAt = Date.now();
  cache.lastRefetchAt = Date.now();
}

export async function getJwksKey(kid: string): Promise<CryptoKey | null> {
  const now = Date.now();
  if (now - cache.fetchedAt > TTL_MS) {
    await refetch();
  }
  if (cache.keys.has(kid)) return cache.keys.get(kid)!;
  // kid 미스: rotation 직후일 수 있음. throttle 통과 시 1회 refetch.
  if (now - cache.lastRefetchAt > REFETCH_THROTTLE_MS) {
    await refetch();
  }
  return cache.keys.get(kid) ?? null;
}

// 테스트용 reset (PoC에서 cache 격리).
export function _resetJwksCache(): void {
  cache.keys = new Map();
  cache.fetchedAt = 0;
  cache.lastRefetchAt = 0;
}
