import { badRequestResponse, noContentResponse } from "@/server/auth/http";
import {
  isValidSession,
  requireSameOrigin,
} from "@/server/auth/require-session";
import {
  decryptDriveTokenForSession,
  revokeAndDenylistStoredToken,
} from "@/server/auth/revoke-encrypted-token";

interface DriveLogoutBody {
  encryptedDriveToken?: unknown;
}

/**
 * Disconnect Google Drive for this browser: revoke the refresh token at
 * Google and denylist the encrypted drive token. Does not end the session.
 */
export async function POST(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  const auth = await isValidSession(request);

  if (auth.error) {
    return auth.error;
  }

  let body: DriveLogoutBody;

  try {
    body = (await request.json()) as DriveLogoutBody;
  } catch {
    return badRequestResponse("invalid json body");
  }

  if (
    typeof body.encryptedDriveToken !== "string" ||
    body.encryptedDriveToken.length === 0
  ) {
    return badRequestResponse("missing encrypted token");
  }

  const driveToken = await decryptDriveTokenForSession(
    body.encryptedDriveToken,
    auth.session.sub,
  );

  if (driveToken.error) {
    return driveToken.error;
  }

  const revoked = await revokeAndDenylistStoredToken(
    driveToken.stored,
    "error revoking drive token",
  );

  if (revoked.error) {
    return revoked.error;
  }

  return noContentResponse();
}
