/**
 * Google OAuth 2.0 authorize URL 빌더.
 * scope = openid email profile (ID token + 기본 프로필).
 * prompt=select_account — 항상 계정 선택 화면 표시 (계정 전환 UX).
 */

const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";

export interface AuthorizeUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
}

export function buildGoogleAuthorizeUrl(p: AuthorizeUrlParams): string {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    nonce: p.nonce,
    prompt: "select_account",
  });
  return `${GOOGLE_AUTHORIZE}?${q.toString()}`;
}
