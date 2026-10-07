import {
  decryptDriveTokenForSession,
  decryptHealthTokenForSession,
  denylistStoredToken,
  revokeGoogleRefreshToken,
  type DecryptedRefreshToken,
} from "@/server/auth/encrypted-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
  noContentResponse,
  readJsonBody,
} from "@/server/auth/http";
import { applyClearedSessionCookie } from "@/server/auth/session-cookie";
import { sessionLogoutBodySchema } from "@/server/auth/request-bodies";
import {
  isValidSession,
  validateSecFetch,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";

function tokenErrorsResponse(errors: unknown[]) {
  const [only] = errors;

  if (only && errors.length === 1) {
    return getHTTPErrorResponse(only);
  }

  if (errors.length === 0) {
    return noContentResponse();
  }

  return jsonResponse(
    {
      error: "token_revoke_failed",
      errorDescription: "some tokens could not be revoked",
    },
    400,
  );
}

async function revokeEncryptedToken(options: {
  encrypted: string;
  sessionSub: string;
  decrypt: (
    encrypted: string,
    sessionSub: string,
  ) => Promise<DecryptedRefreshToken>;
  unlink: boolean;
  revokeErrorMessage: string;
}): Promise<void> {
  const verified = await options.decrypt(options.encrypted, options.sessionSub);

  await denylistStoredToken(verified);

  if (!options.unlink) {
    return;
  }

  await revokeGoogleRefreshToken(
    verified.refreshToken,
    options.revokeErrorMessage,
  );
}

/**
 * End this browser session. Optional encrypted health/drive tokens are
 * denylisted. Pass `unlink: true` to also revoke the Google refresh tokens
 * and invalidate every other session for this user.
 */
export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const body = await readJsonBody(request, sessionLogoutBodySchema);
    const unlink = body.unlink === true;
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.add(session.jti, session.exp);

    if (unlink) {
      await revocationDatabase.invalidateIssuedBeforeNow(session.sub);
    }

    const tokenErrors: unknown[] = [];

    try {
      if (body.encryptedHealthToken) {
        await revokeEncryptedToken({
          encrypted: body.encryptedHealthToken,
          sessionSub: session.sub,
          decrypt: decryptHealthTokenForSession,
          unlink,
          revokeErrorMessage: "error revoking health token",
        });
      }
    } catch (error) {
      tokenErrors.push(error);
    }

    try {
      if (body.encryptedDriveToken) {
        await revokeEncryptedToken({
          encrypted: body.encryptedDriveToken,
          sessionSub: session.sub,
          decrypt: decryptDriveTokenForSession,
          unlink,
          revokeErrorMessage: "error revoking drive token",
        });
      }
    } catch (error) {
      tokenErrors.push(error);
    }

    return applyClearedSessionCookie(tokenErrorsResponse(tokenErrors));
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}
