import { FetchHeaderError, TokenValidationError } from "./errors";
import { readBearerToken } from "./http";
import { getRevocationDatabase } from "./revocation-database";
import { verifySessionToken, type SessionClaims } from "./session-token";

export function validateSecFetch(request: Request): void {
  if (request.headers.get("Sec-Fetch-Site") !== "same-origin") {
    throw new FetchHeaderError();
  }
}

export async function isValidSession(request: Request): Promise<SessionClaims> {
  const token = readBearerToken(request);

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
