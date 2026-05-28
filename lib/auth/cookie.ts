/**
 * Set-Cookie 직렬화 + Cookie 헤더 파싱.
 * 모든 인증 쿠키는 HttpOnly + Secure + SameSite=Lax + Path=/.
 * (SameSite=Lax는 OAuth callback redirect — top-level navigation — 허용.)
 */

export const COOKIE_SESSION = "brennhub_session";
export const COOKIE_STATE = "auth_state";

export interface CookieOptions {
  maxAgeSeconds: number; // 0 = clear
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
}

export function serializeCookie(
  name: string,
  value: string,
  opts: CookieOptions,
): string {
  const parts = [`${name}=${value}`];
  parts.push("HttpOnly");
  parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  parts.push(`Max-Age=${opts.maxAgeSeconds}`);
  return parts.join("; ");
}

export function clearCookie(name: string): string {
  return serializeCookie(name, "", { maxAgeSeconds: 0 });
}

export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

export function readCookie(headers: Headers, name: string): string | null {
  return parseCookies(headers.get("cookie"))[name] ?? null;
}
