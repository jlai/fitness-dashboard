import {
  decryptDriveRefreshToken,
  decryptRefreshToken,
  isExpiredEncryptedTokenError,
  type DecryptedRefreshToken,
} from "./encrypted-token";
import { revokeGoogleToken } from "./google-oauth-token";
import {
  forbiddenResponse,
  internalErrorResponse,
  jsonResponse,
  unauthorizedResponse,
} from "./http";
import { getRevocationDatabase } from "./revocation-database";

export type DecryptTokenResult =
  | { stored: DecryptedRefreshToken; error?: undefined }
  | { stored?: undefined; error: Response };

async function decryptTokenForSession(options: {
  encrypted: string;
  sessionSub: string;
  decrypt: (token: string) => Promise<DecryptedRefreshToken>;
  expiredMessage: string;
}): Promise<DecryptTokenResult> {
  let stored: DecryptedRefreshToken;

  try {
    stored = await options.decrypt(options.encrypted);
  } catch (error) {
    if (isExpiredEncryptedTokenError(error)) {
      return { error: unauthorizedResponse(options.expiredMessage) };
    }

    return { error: forbiddenResponse("invalid encrypted token") };
  }

  if (stored.sub !== options.sessionSub) {
    return {
      error: forbiddenResponse("session does not match encrypted token"),
    };
  }

  return { stored };
}

export async function decryptHealthTokenForSession(
  encrypted: string,
  sessionSub: string,
): Promise<DecryptTokenResult> {
  return decryptTokenForSession({
    encrypted,
    sessionSub,
    decrypt: decryptRefreshToken,
    expiredMessage: "encrypted health token has expired",
  });
}

export async function decryptDriveTokenForSession(
  encrypted: string,
  sessionSub: string,
): Promise<DecryptTokenResult> {
  return decryptTokenForSession({
    encrypted,
    sessionSub,
    decrypt: decryptDriveRefreshToken,
    expiredMessage: "encrypted drive token has expired",
  });
}

export async function denylistStoredToken(stored: DecryptedRefreshToken) {
  const revocationDatabase = await getRevocationDatabase();
  await revocationDatabase.add(stored.jti, stored.exp);
}

export async function revokeGoogleRefreshToken(
  refreshToken: string,
  internalErrorMessage: string,
): Promise<{ error?: Response }> {
  try {
    const { status } = await revokeGoogleToken(refreshToken);

    if (status !== 200) {
      return {
        error: jsonResponse(
          {
            error: "token_revoke_failed",
            errorDescription: "refresh token revocation failed",
          },
          status,
        ),
      };
    }

    return {};
  } catch {
    return { error: internalErrorResponse(internalErrorMessage) };
  }
}

export async function revokeAndDenylistStoredToken(
  stored: DecryptedRefreshToken,
  internalErrorMessage: string,
): Promise<{ error?: Response }> {
  await denylistStoredToken(stored);
  return revokeGoogleRefreshToken(stored.refreshToken, internalErrorMessage);
}
