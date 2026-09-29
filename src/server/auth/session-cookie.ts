import { parseCookie, stringifyCookie, stringifySetCookie } from "cookie";

export const SESSION_COOKIE_NAME = "__Host-session";

const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
};

export function sessionCookieRequestHeader(token: string) {
  return stringifyCookie({ [SESSION_COOKIE_NAME]: token });
}

/**
 * Remaining cookie lifetime in seconds: the smaller of the requested hours
 * and time left until the session JWT expires.
 */
export function sessionCookieMaxAgeSeconds(
  maxLifetimeHours: number,
  exp: number,
  nowSeconds = Math.floor(Date.now() / 1000),
) {
  const requested = Math.floor(maxLifetimeHours * 3600);
  const remaining = Math.max(0, exp - nowSeconds);

  return Math.min(requested, remaining);
}

export function serializeSessionCookie(token: string, maxAgeSeconds?: number) {
  return stringifySetCookie({
    name: SESSION_COOKIE_NAME,
    value: token,
    ...SESSION_COOKIE_OPTIONS,
    ...(maxAgeSeconds === undefined ? {} : { maxAge: maxAgeSeconds }),
  });
}

export function serializeClearedSessionCookie() {
  return stringifySetCookie({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export function applySessionCookie(
  response: Response,
  token: string,
  maxAgeSeconds?: number,
) {
  response.headers.append(
    "Set-Cookie",
    serializeSessionCookie(token, maxAgeSeconds),
  );

  return response;
}

export function applyClearedSessionCookie(response: Response) {
  response.headers.append("Set-Cookie", serializeClearedSessionCookie());

  return response;
}

export function readSessionCookie(request: Request) {
  const header = request.headers.get("Cookie");

  if (!header) {
    return undefined;
  }

  const token = parseCookie(header)[SESSION_COOKIE_NAME];

  return token || undefined;
}
