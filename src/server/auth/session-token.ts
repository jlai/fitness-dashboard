import { jwtVerify, SignJWT } from "jose";

import {
  getSessionTokenKey,
  getSiteTokenDefaultExpirationSeconds,
  resolveSessionTokenKey,
} from "./env";

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
  const exp = params.exp ?? iat + getSiteTokenDefaultExpirationSeconds();
  const jti = params.jti ?? crypto.randomUUID();

  const tokenKey = getSessionTokenKey();

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
  const { payload } = await jwtVerify(
    token,
    (header) => resolveSessionTokenKey(header.kid).key,
    {
      algorithms: ["HS256"],
      typ: SESSION_TOKEN_TYP,
    },
  );

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("session token is missing sub");
  }

  if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat)) {
    throw new Error("session token is missing iat");
  }

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    throw new Error("session token is missing exp");
  }

  if (typeof payload.jti !== "string" || payload.jti.length === 0) {
    throw new Error("session token is missing jti");
  }

  return {
    sub: payload.sub,
    iat: payload.iat,
    exp: payload.exp,
    jti: payload.jti,
  };
}
