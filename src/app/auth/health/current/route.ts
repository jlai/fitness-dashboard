import {
  decryptRefreshToken,
  isExpiredEncryptedTokenError,
} from "@/server/auth/encrypted-token";
import {
  badRequestResponse,
  forbiddenResponse,
  unauthorizedResponse,
} from "@/server/auth/http";
import {
  requireSameOrigin,
  isValidSession,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";

interface RevokeCurrentHealthBody {
  encrypted_health_token?: unknown;
}

/** Denylist this browser's encrypted health token jti without revoking Google access. */
export async function DELETE(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  const auth = await isValidSession(request);

  if (auth.error) {
    return auth.error;
  }

  let body: RevokeCurrentHealthBody;

  try {
    body = (await request.json()) as RevokeCurrentHealthBody;
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
  await revocationDatabase.add(stored.jti, stored.exp);

  return new Response(null, { status: 204 });
}
