/**
 * CSPRNG hex helpers (Workers Web Crypto).
 * 16-byte = user id / 32-byte = session cookie value 등.
 */

export function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

export function randomHex(byteLen: number): string {
  const bytes = randomBytes(byteLen);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
