import { encryptRefreshToken } from "@/server/auth/encrypted-token";
import { getConfiguredRedirectUri } from "@/server/auth/env";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import { exchangeAuthorizationCode } from "@/server/auth/google-oauth-token";
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

interface AuthorizeBody {
  code?: unknown;
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

  let body: AuthorizeBody;

  try {
    body = (await request.json()) as AuthorizeBody;
  } catch {
    return badRequestResponse("invalid json body");
  }

  if (typeof body.code !== "string" || body.code.length === 0) {
    return badRequestResponse("missing authorization code");
  }

  try {
    const { status, payload } = await exchangeAuthorizationCode({
      code: body.code,
      redirectUri: getConfiguredRedirectUri(),
    });

    if (status !== 200 || payload.error || !payload.access_token) {
      return jsonResponse(
        {
          error: payload.error ?? "token_exchange_failed",
          error_description:
            payload.error_description ?? "authorization code exchange failed",
        },
        status === 200 ? 400 : status,
      );
    }

    if (payload.id_token) {
      try {
        const codeUser = await verifyGoogleIdToken(payload.id_token);

        if (codeUser.sub !== auth.session.sub) {
          return forbiddenResponse(
            "authorization code user does not match session",
          );
        }
      } catch {
        return unauthorizedResponse("invalid id_token from token exchange");
      }
    }

    if (!payload.refresh_token) {
      return badRequestResponse("no refresh token returned");
    }

    const encrypted_health_token = await encryptRefreshToken({
      sub: auth.session.sub,
      refreshToken: payload.refresh_token,
      scope: payload.scope,
    });

    return jsonResponse({
      access_token: payload.access_token,
      expires_in: payload.expires_in,
      scope: payload.scope,
      encrypted_health_token,
    });
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "token request failed";

    console.error("error exchanging authorization code for token", reason);

    return internalErrorResponse(message);
  }
}
