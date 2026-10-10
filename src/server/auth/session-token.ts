import { errors, jwtVerify, SignJWT } from "jose";

import { getSessionTokenExpirationSeconds } from "./env";
import { TokenValidationError } from "./errors";
import { getSessionSecretStore } from "./get-secret-store";

export const SESSION_TOKEN_TYP = "session+jwt";

export interface SessionClaims {
  sub: string;
  iat: number;
  exp: number;
  jti: string;
}

export async function signSessionToken(params: {
  sub: string;
  iat?: number;
  exp?: number;
  jti?: string;
}) {
  const iat = params.iat ?? Math.floor(Date.now() / 1000);
  const exp = params.exp ?? iat + getSessionTokenExpirationSeconds();
  const jti = params.jti ?? crypto.randomUUID();

  const tokenKey = await getSessionSecretStore().getActiveKey();

  return new SignJWT({})
    .setProtectedHeader({
      alg: "HS256",
      typ: SESSION_TOKEN_TYP,
      kid: tokenKey.kid,
    })
    .setSubject(params.sub)
    .setJti(jti)
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(tokenKey.key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims> {
  let payload;

  try {
    const store = getSessionSecretStore();
    ({ payload } = await jwtVerify(
      token,
      async (header) => (await store.getKeyById(header.kid)).key,
      {
        algorithms: ["HS256"],
        typ: SESSION_TOKEN_TYP,
      },
    ));
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new TokenValidationError("session token has expired");
    }

    throw new TokenValidationError("invalid session token");
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new TokenValidationError("invalid session token");
  }

  if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat)) {
    throw new TokenValidationError("invalid session token");
  }

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    throw new TokenValidationError("invalid session token");
  }

  if (typeof payload.jti !== "string" || payload.jti.length === 0) {
    throw new TokenValidationError("invalid session token");
  }

  return {
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
    jti: payload.jti,
  };
}
