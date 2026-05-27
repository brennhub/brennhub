/**
 * Open redirect 방어 — returnTo가 안전한 same-origin path인지 검증.
 *
 * 허용: '/' 로 시작 + '//' 로 시작 안 함 (protocol-relative `//evil.com` 차단)
 *        + 백슬래시도 차단 (`/\\evil.com` 등 URL 파서 트릭).
 * 위반: '/' fallback.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  if (value.startsWith("/\\")) return "/";
  if (value.length > 2048) return "/";
  return value;
}
