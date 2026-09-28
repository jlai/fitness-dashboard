import {
  badRequestResponse,
  jsonResponse,
  noContentResponse,
} from "@/server/auth/http";
import {
  isValidSession,
  requireSameOrigin,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";
import {
  decryptDriveTokenForSession,
  decryptHealthTokenForSession,
  denylistStoredToken,
  revokeGoogleRefreshToken,
  type DecryptTokenResult,
} from "@/server/auth/revoke-encrypted-token";

interface LogoutBody {
  encryptedHealthToken?: unknown;
  encryptedDriveToken?: unknown;
  unlink?: unknown;
}

function readOptionalEncryptedToken(value: unknown): {
  token?: string;
  error?: Response;
} {
  if (value === undefined) {
    return {};
  }

  if (typeof value !== "string" || value.length === 0) {
    return { error: badRequestResponse("missing encrypted token") };
  }

  return { token: value };
}

function tokenErrorsResponse(errors: Response[]) {
  const [only] = errors;

  if (only && errors.length === 1) {
    return only;
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
  ) => Promise<DecryptTokenResult>;
  unlink: boolean;
  revokeErrorMessage: string;
}): Promise<Response | undefined> {
  const decrypted = await options.decrypt(
    options.encrypted,
    options.sessionSub,
  );

  if (decrypted.error) {
    return decrypted.error;
  }

  await denylistStoredToken(decrypted.stored);

  if (!options.unlink) {
    return undefined;
  }

  const revoked = await revokeGoogleRefreshToken(
    decrypted.stored.refreshToken,
    options.revokeErrorMessage,
  );

  return revoked.error;
}

/**
 * End this browser session. Optional encrypted health/drive tokens are
 * denylisted. Pass `unlink: true` to also revoke the Google refresh tokens
 * and invalidate every other session for this user.
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

  let body: LogoutBody;

  try {
    body = (await request.json()) as LogoutBody;
  } catch {
    return badRequestResponse("invalid json body");
  }

  if (body.unlink !== undefined && typeof body.unlink !== "boolean") {
    return badRequestResponse("invalid unlink");
  }

  const unlink = body.unlink === true;
  const revocationDatabase = await getRevocationDatabase();
  await revocationDatabase.add(auth.session.jti, auth.session.exp);

  if (unlink) {
    await revocationDatabase.invalidateIssuedBefore(
      auth.session.sub,
      Math.floor(Date.now() / 1000),
    );
  }

  const tokenErrors: Response[] = [];

  const healthField = readOptionalEncryptedToken(body.encryptedHealthToken);

  if (healthField.error) {
    tokenErrors.push(healthField.error);
  } else if (healthField.token) {
    const error = await revokeEncryptedToken({
      encrypted: healthField.token,
      sessionSub: auth.session.sub,
      decrypt: decryptHealthTokenForSession,
      unlink,
      revokeErrorMessage: "error revoking health token",
    });

    if (error) {
      tokenErrors.push(error);
    }
  }

  const driveField = readOptionalEncryptedToken(body.encryptedDriveToken);

  if (driveField.error) {
    tokenErrors.push(driveField.error);
  } else if (driveField.token) {
    const error = await revokeEncryptedToken({
      encrypted: driveField.token,
      sessionSub: auth.session.sub,
      decrypt: decryptDriveTokenForSession,
      unlink,
      revokeErrorMessage: "error revoking drive token",
    });

    if (error) {
      tokenErrors.push(error);
    }
  }

  return tokenErrorsResponse(tokenErrors);
}
