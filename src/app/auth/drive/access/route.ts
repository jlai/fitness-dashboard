import {
  decryptDriveRefreshToken,
  encryptDriveRefreshToken,
  isExpiredEncryptedTokenError,
} from "@/server/auth/encrypted-token";
import { refreshAccessToken } from "@/server/auth/google-oauth-token";
import {
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  jsonResponse,
  unauthorizedResponse,
} from "@/server/auth/http";
import {
  isValidSession,
  requireSameOrigin,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";

interface AccessBody {
  encryptedDriveToken?: unknown;
}

export async function POST(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  const auth = await isValidSession(request);

  if (auth.error) {
    return auth.error;
  }

  let body: AccessBody;

  try {
    body = (await request.json()) as AccessBody;
  } catch {
    return badRequestResponse("invalid json body");
  }

  if (
    typeof body.encryptedDriveToken !== "string" ||
    body.encryptedDriveToken.length === 0
  ) {
    return badRequestResponse("missing encrypted token");
  }

  let stored;

  try {
    stored = await decryptDriveRefreshToken(body.encryptedDriveToken);
  } catch (error) {
    if (isExpiredEncryptedTokenError(error)) {
      return unauthorizedResponse("encrypted drive token has expired");
    }

    return forbiddenResponse("invalid encrypted token");
  }

  if (stored.sub !== auth.session.sub) {
    return forbiddenResponse("session does not match encrypted token");
  }

  const revocationDatabase = await getRevocationDatabase();

  if (
    await revocationDatabase.isRevoked({
      jti: stored.jti,
      sub: stored.sub,
      iat: stored.iat,
    })
  ) {
    return unauthorizedResponse("encrypted drive token has been revoked");
  }

  try {
    const { status, payload } = await refreshAccessToken(stored.refreshToken);

    if (status !== 200 || payload.error || !payload.access_token) {
      return jsonResponse(
        {
          error: "token_refresh_failed",
          errorDescription: "refresh token exchange failed",
        },
        status === 200 ? 400 : status,
      );
    }

    const scope = payload.scope ?? stored.scope;
    const refreshToken = payload.refresh_token ?? stored.refreshToken;
    // Re-encrypt so the client gets a refreshed iat/exp window.
    const encryptedDriveToken = await encryptDriveRefreshToken({
      sub: stored.sub,
      refreshToken,
      scope,
    });

    return jsonResponse({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in,
      scope,
      encryptedDriveToken,
    });
  } catch {
    return internalErrorResponse("error refreshing drive access token");
  }
}
