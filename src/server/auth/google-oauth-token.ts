import {
  getClientSecret,
  getConfiguredClientId,
  GOOGLE_TOKEN_ENDPOINT,
} from "./env";

export interface GoogleTokenEndpointResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeAuthorizationCode(params: {
  code: string;
  redirectUri: string;
}) {
  return requestGoogleToken({
    grant_type: "authorization_code",
    code: params.code,
    client_id: getConfiguredClientId(),
    redirect_uri: params.redirectUri,
  });
}

export async function refreshAccessToken(refreshToken: string) {
  return requestGoogleToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: getConfiguredClientId(),
  });
}

async function requestGoogleToken(params: Record<string, string>) {
  const body = new URLSearchParams({
    ...params,
    client_secret: getClientSecret(),
  });

  const googleResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await googleResponse.json()) as GoogleTokenEndpointResponse;

  return { status: googleResponse.status, payload };
}
