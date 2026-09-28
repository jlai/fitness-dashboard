import {
  decryptDriveRefreshToken,
  encryptDriveRefreshToken,
  isValidEncryptedToken,
} from "@/server/auth/encrypted-token";
import { InternalAuthError, TokenEndpointError } from "@/server/auth/errors";
import { refreshAccessToken } from "@/server/auth/google-oauth-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
  readJsonBody,
} from "@/server/auth/http";
import { driveAccessBodySchema } from "@/server/auth/request-bodies";
import {
  isValidSession,
  validateSecFetch,
} from "@/server/auth/require-session";

export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const { encryptedDriveToken } = await readJsonBody(
      request,
      driveAccessBodySchema,
    );
    const verified = await isValidEncryptedToken({
      encrypted: encryptedDriveToken,
      sessionSub: session.sub,
      decrypt: decryptDriveRefreshToken,
    });

    let status;
    let payload;

    try {
      ({ status, payload } = await refreshAccessToken(verified.refreshToken));
    } catch {
      throw new InternalAuthError("error refreshing drive access token");
    }

    if (status !== 200 || payload.error || !payload.access_token) {
      throw new TokenEndpointError(
        "token_refresh_failed",
        "refresh token exchange failed",
      );
    }

    const scope = payload.scope ?? verified.scope;
    const refreshToken = payload.refresh_token ?? verified.refreshToken;
    // Re-encrypt so the client gets a refreshed iat/exp window.
    const nextEncryptedDriveToken = await encryptDriveRefreshToken({
      sub: verified.sub,
      refreshToken,
      scope,
    });

    return jsonResponse({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in,
      scope,
      encryptedDriveToken: nextEncryptedDriveToken,
    });
  } catch (error) {
    return getHTTPErrorResponse(error, "error refreshing drive access token");
  }
}
