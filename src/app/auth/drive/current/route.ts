import {
  decryptDriveRefreshToken,
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

interface RevokeCurrentDriveBody {
  encrypted_drive_token?: unknown;
}

/** Denylist this browser's encrypted drive token jti without revoking Google access. */
export async function DELETE(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  const auth = await isValidSession(request);

  if (auth.error) {
    return auth.error;
  }

  let body: RevokeCurrentDriveBody;

  try {
    body = (await request.json()) as RevokeCurrentDriveBody;
  } catch {
    return badRequestResponse("invalid json body");
  }

  if (
    typeof body.encrypted_drive_token !== "string" ||
    body.encrypted_drive_token.length === 0
  ) {
    return badRequestResponse("missing encrypted token");
  }

  let stored;

  try {
    stored = await decryptDriveRefreshToken(body.encrypted_drive_token);
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
  await revocationDatabase.add(stored.jti, stored.exp);

  return new Response(null, { status: 204 });
}
