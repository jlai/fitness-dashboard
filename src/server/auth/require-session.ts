import { FetchHeaderError, TokenValidationError } from "./errors";
import { getRevocationDatabase } from "./revocation-database";
import { readSessionCookie } from "./session-cookie";
import { verifySessionToken, type SessionClaims } from "./session-token";

export function validateSecFetch(request: Request): void {
  if (request.headers.get("Sec-Fetch-Site") !== "same-origin") {
    throw new FetchHeaderError();
  }
}

export async function isValidSession(request: Request): Promise<SessionClaims> {
  // This may already have been checked, but it's cheap to do it again
  validateSecFetch(request);

  const token = readSessionCookie(request);

  if (!token) {
    throw new TokenValidationError("missing session token");
  }

  const session = await verifySessionToken(token);
  const revocationDatabase = await getRevocationDatabase();

  if (
    await revocationDatabase.isRevoked({
      jti: session.jti,
      sub: session.sub,
      iat: session.iat,
    })
  ) {
    throw new TokenValidationError("session token has been revoked");
  }

  return session;
}
