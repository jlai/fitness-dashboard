import {
  decryptRefreshToken,
  encryptRefreshToken,
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
  requireSameOrigin,
  isValidSession,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";

interface AccessBody {
  encrypted_health_token?: unknown;
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
    typeof body.encrypted_health_token !== "string" ||
    body.encrypted_health_token.length === 0
  ) {
    return badRequestResponse("missing encrypted token");
  }

  let stored;

  try {
    stored = await decryptRefreshToken(body.encrypted_health_token);
  } catch (error) {
    if (isExpiredEncryptedTokenError(error)) {
      return unauthorizedResponse("encrypted health token has expired");
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
    return unauthorizedResponse("encrypted health token has been revoked");
  }

  try {
    const { status, payload } = await refreshAccessToken(stored.refreshToken);

    if (status !== 200 || payload.error || !payload.access_token) {
      return jsonResponse(
        {
          error: "token_refresh_failed",
          error_description: "refresh token exchange failed",
        },
        status === 200 ? 400 : status,
      );
    }

    const scope = payload.scope ?? stored.scope;
    const refreshToken = payload.refresh_token ?? stored.refreshToken;
    // Re-encrypt so the client gets a refreshed iat/exp window.
    const encrypted_health_token = await encryptRefreshToken({
      sub: stored.sub,
      refreshToken,
      scope,
    });

    return jsonResponse({
      access_token: payload.access_token,
      expires_in: payload.expires_in,
      scope,
      encrypted_health_token,
    });
  } catch {
    return internalErrorResponse("error refreshing access token");
  }
}
