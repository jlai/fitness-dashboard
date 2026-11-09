import {
  getSessionTokenExpirationSeconds,
  MAX_SESSION_TOKEN_EXPIRATION_MINUTES,
} from "@/server/auth/env";
import {
  RequestValidationError,
  TokenValidationError,
} from "@/server/auth/errors";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
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
    const { idToken, sessionLifetimeMinutes } = await readJsonBody(
      request,
      createSessionBodySchema,
    );

    let claims;

    try {
      claims = await verifyGoogleIdToken(idToken);
    } catch {
      logError("error verifying google id token");
      throw new TokenValidationError("invalid idToken");
    }

    const iat = Math.floor(Date.now() / 1000);
    const sessionLifetimeSeconds = Math.min(
      getSessionTokenExpirationSeconds(),
      2 * 60 * 60,
    );
    const exp = iat + sessionLifetimeSeconds;
    const sessionToken = await signSessionToken({
      sub: claims.sub,
      iat,
      exp,
    });

    return applySessionCookie(
      jsonResponse({ sub: claims.sub, exp }),
      sessionToken,
      sessionLifetimeMinutes !== undefined
        ? sessionCookieMaxAgeSeconds(sessionLifetimeSeconds / 3600, exp, iat)
        : undefined,
    );
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}

/**
 * Update the JWT and session cookie lifetime for the selected duration.
 */
export async function PATCH(request: Request) {
  try {
    validateSecFetch(request);
    const session = await isValidSession(request);
    const { sessionLifetimeMinutes } = await readJsonBody(
      request,
      patchSessionBodySchema,
    );
    const now = Math.floor(Date.now() / 1000);
    const boundedLifetimeMinutes = Math.min(
      sessionLifetimeMinutes,
      MAX_SESSION_TOKEN_EXPIRATION_MINUTES,
    );
    const exp =
      session.iat + Math.max(1, Math.floor(boundedLifetimeMinutes * 60));

    if (exp <= now) {
      throw new RequestValidationError(
        "requested session lifetime has elapsed",
      );
    }
    const sessionToken = await signSessionToken({
      sub: session.sub,
      iat: session.iat,
      exp,
      jti: session.jti,
    });

    return applySessionCookie(
      jsonResponse({ sub: session.sub, exp }),
      sessionToken,
      sessionCookieMaxAgeSeconds(boundedLifetimeMinutes / 60, exp, now),
    );
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}
