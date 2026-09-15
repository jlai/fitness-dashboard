import { decryptRefreshToken } from "@/server/auth/encrypted-token";
import { revokeGoogleToken } from "@/server/auth/google-oauth-token";
import {
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  jsonResponse,
} from "@/server/auth/http";
import {
  requireSameOrigin,
  isValidSession,
} from "@/server/auth/require-session";

interface RevokeHealthBody {
  encrypted_health_token?: unknown;
}

export async function DELETE(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  const auth = await isValidSession(request);

  if (auth.error) {
    return auth.error;
  }

  let body: RevokeHealthBody;

  try {
    body = (await request.json()) as RevokeHealthBody;
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
  } catch {
    return forbiddenResponse("invalid encrypted token");
  }

  if (stored.sub !== auth.session.sub) {
    return forbiddenResponse("session does not match encrypted token");
  }

  try {
    const { status } = await revokeGoogleToken(stored.refreshToken);

    if (status !== 200) {
      return jsonResponse(
        {
          error: "token_revoke_failed",
          error_description: "refresh token revocation failed",
        },
        status,
      );
    }

    return new Response(null, { status: 204 });
  } catch {
    return internalErrorResponse("error revoking health token");
  }
}
