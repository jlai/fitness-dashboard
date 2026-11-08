import { getSessionTokenExpirationSeconds } from "@/server/auth/env";
import { TokenValidationError } from "@/server/auth/errors";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
  noContentResponse,
  readJsonBody,
} from "@/server/auth/http";
import {
  createSessionBodySchema,
  patchSessionBodySchema,
} from "@/server/auth/request-bodies";
import {
  isValidSession,
  validateSecFetch,
} from "@/server/auth/require-session";
import {
  applySessionCookie,
  readSessionCookie,
  sessionCookieMaxAgeSeconds,
} from "@/server/auth/session-cookie";
import { signSessionToken } from "@/server/auth/session-token";
import { logError } from "@/utils/log-error";

/**
 * Return the current session subject and expiry from the session cookie.
 */
export async function GET(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);

    return jsonResponse({ sub: session.sub, exp: session.exp });
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}

/**
 * Create a new session token for the user from a Google OpenID Connect token
 */
export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const { idToken } = await readJsonBody(request, createSessionBodySchema);

    let claims;

    try {
      claims = await verifyGoogleIdToken(idToken);
    } catch {
      logError("error verifying google id token");
      throw new TokenValidationError("invalid idToken");
    }

    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + getSessionTokenExpirationSeconds();
    const sessionToken = await signSessionToken({
      sub: claims.sub,
      iat,
      exp,
    });

    return applySessionCookie(
      jsonResponse({ sub: claims.sub, exp }),
      sessionToken,
    );
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}

/**
 * Extend the session cookie lifetime up to the remaining JWT exp time.
 */
export async function PATCH(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const { maxLifetimeHours } = await readJsonBody(
      request,
      patchSessionBodySchema,
    );
    const sessionToken = readSessionCookie(request);

    if (!sessionToken) {
      throw new TokenValidationError("missing session token");
    }

    const maxAge = sessionCookieMaxAgeSeconds(maxLifetimeHours, session.exp);

    return applySessionCookie(noContentResponse(), sessionToken, maxAge);
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}
