import { encryptDriveRefreshToken } from "@/server/auth/encrypted-token";
import { getConfiguredRedirectUri } from "@/server/auth/env";
import {
  InternalAuthError,
  RequestValidationError,
  TokenEndpointError,
  TokenValidationError,
} from "@/server/auth/errors";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import { exchangeAuthorizationCode } from "@/server/auth/google-oauth-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
  readJsonBody,
} from "@/server/auth/http";
import { authorizeBodySchema } from "@/server/auth/request-bodies";
import {
  isValidSession,
  validateSecFetch,
} from "@/server/auth/require-session";

export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const { code } = await readJsonBody(request, authorizeBodySchema);

    let status;
    let payload;

    try {
      ({ status, payload } = await exchangeAuthorizationCode({
        code,
        redirectUri: getConfiguredRedirectUri(),
      }));
    } catch {
      throw new InternalAuthError(
        "error exchanging authorization code for drive token",
      );
    }

    if (status !== 200 || payload.error || !payload.access_token) {
      throw new TokenEndpointError(
        payload.error ?? "token_exchange_failed",
        payload.error_description ?? "authorization code exchange failed",
      );
    }

    if (payload.id_token) {
      try {
        const codeUser = await verifyGoogleIdToken(payload.id_token);

        if (codeUser.sub !== session.sub) {
          throw new TokenValidationError(
            "authorization code user does not match session",
          );
        }
      } catch (error) {
        if (error instanceof TokenValidationError) {
          throw error;
        }

        throw new TokenValidationError("invalid idToken from token exchange");
      }
    }

    if (!payload.refresh_token) {
      throw new RequestValidationError("no refresh token returned");
    }

    const encryptedDriveToken = await encryptDriveRefreshToken({
      sub: session.sub,
      refreshToken: payload.refresh_token,
      scope: payload.scope,
    });

    return jsonResponse({
      accessToken: payload.access_token,
      expiresIn: payload.expires_in,
      scope: payload.scope,
      encryptedDriveToken,
    });
  } catch (error) {
    return getHTTPErrorResponse(
      error,
      "error exchanging authorization code for drive token",
    );
  }
}
