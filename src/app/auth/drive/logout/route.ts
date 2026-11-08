import {
  decryptDriveTokenForSession,
  revokeAndDenylistStoredToken,
} from "@/server/auth/encrypted-token";
import {
  getHTTPErrorResponse,
  noContentResponse,
  readJsonBody,
} from "@/server/auth/http";
import { driveLogoutBodySchema } from "@/server/auth/request-bodies";
import {
  isValidSession,
  validateSecFetch,
} from "@/server/auth/require-session";

/**
 * Disconnect Google Drive for this browser: revoke the refresh token at
 * Google and denylist the encrypted drive token. Does not end the session.
 */
export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const { encryptedDriveToken } = await readJsonBody(
      request,
      driveLogoutBodySchema,
    );
    const verified = await decryptDriveTokenForSession(
      encryptedDriveToken,
      session.sub,
    );

    await revokeAndDenylistStoredToken(verified);

    return noContentResponse();
  } catch (error) {
    return getHTTPErrorResponse(error, "error revoking drive token");
  }
}
