import {
  decryptHealthRefreshToken,
  encryptRefreshToken,
  isValidEncryptedToken,
} from "@/server/auth/encrypted-token";
import { GoogleTokenEndpointError } from "@/server/auth/errors";
import { refreshAccessToken } from "@/server/auth/google-oauth-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
  readJsonBody,
} from "@/server/auth/http";
import { healthAccessBodySchema } from "@/server/auth/request-bodies";
import {
  isValidSession,
  validateSecFetch,
} from "@/server/auth/require-session";

export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const { encryptedHealthToken } = await readJsonBody(
      request,
      healthAccessBodySchema,
    );
    const verified = await isValidEncryptedToken({
      encrypted: encryptedHealthToken,
      sessionSub: session.sub,
      decrypt: decryptHealthRefreshToken,
    });

    const { status, payload } = await refreshAccessToken(verified.refreshToken);

    if (status !== 200 || payload.error || !payload.access_token) {
      throw new GoogleTokenEndpointError(
        "token_refresh_failed",
        "refresh token exchange failed",
      );
    }

    const scope = payload.scope ?? verified.scope;
    const refreshToken = payload.refresh_token ?? verified.refreshToken;
    // Re-encrypt so the client gets a refreshed iat/exp window.
    const nextEncryptedHealthToken = await encryptRefreshToken({
      sub: verified.sub,
      refreshToken,
      scope,
    });

    return jsonResponse({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in,
      scope,
      encryptedHealthToken: nextEncryptedHealthToken,
    });
  } catch (error) {
    return getHTTPErrorResponse(error, "error refreshing access token");
  }
}
