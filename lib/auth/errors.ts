/**
 * 인증 에러 코드 — /?auth_error=<code> 로 클라이언트 토스트(1-C)에서 매핑.
 */
export type AuthErrorCode =
  | "state_mismatch"
  | "state_invalid"
  | "state_expired"
  | "token_exchange_failed"
  | "id_token_invalid"
  | "id_token_unverified_email"
  | "db_error"
  | "internal";
