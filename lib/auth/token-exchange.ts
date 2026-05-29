/**
 * Authorization code → tokens 교환.
 * Google token endpoint POST. id_token만 사용 (access_token은 보관 X).
 */

const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export interface TokenExchangeInput {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(
  input: TokenExchangeInput,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`token_exchange_failed: ${res.status} ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as TokenResponse;
  if (!json?.id_token) throw new Error("token_exchange_failed: missing id_token");
  return json;
}
