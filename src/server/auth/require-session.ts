import { getProxyRequestError } from "./guards";
import {
  forbiddenResponse,
  readBearerToken,
  unauthorizedResponse,
} from "./http";
import { getRevocationDatabase } from "./revocation-database";
import { verifySessionToken, type SessionClaims } from "./session-token";

export function requireSameOrigin(
  request: Request,
): { error: Response } | { error?: undefined } {
  const proxyError = getProxyRequestError(request);

  if (proxyError) {
    return { error: forbiddenResponse(proxyError) };
  }

  return {};
}

export async function isValidSession(
  request: Request,
): Promise<
  | { session: SessionClaims; error?: undefined }
  | { session?: undefined; error: Response }
> {
  const token = readBearerToken(request);

  if (!token) {
    return { error: unauthorizedResponse("missing session token") };
  }

  let session: SessionClaims;

  try {
    session = await verifySessionToken(token);
  } catch {
    return { error: unauthorizedResponse("invalid session token") };
  }

  const revocationDatabase = await getRevocationDatabase();

  if (await revocationDatabase.isRevoked(session.jti)) {
    return { error: unauthorizedResponse("session token has been revoked") };
  }

  return { session };
}
