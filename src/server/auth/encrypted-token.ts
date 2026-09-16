import { EncryptJWT, errors, jwtDecrypt } from "jose";

import { getHealthSecretStore } from "./get-secret-store";

export interface EncryptedRefreshTokenPayload {
  sub: string;
  refreshToken: string;
  scope?: string;
}

export interface DecryptedRefreshToken extends EncryptedRefreshTokenPayload {
  jti: string;
  iat: number;
  exp: number;
}

/** Encrypted health JWEs expire after 15 days and must be refreshed via /auth/health/access. */
export const ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS = 15 * 24 * 60 * 60;

const TOKEN_TYP = "refresh+jwt";

interface RefreshTokenClaims {
  refresh_token?: unknown;
  scope?: unknown;
}

export async function encryptRefreshToken(
  payload: EncryptedRefreshTokenPayload,
) {
  const tokenKey = await getHealthSecretStore().getActiveKey();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS;
  const jti = crypto.randomUUID();
  const jwt = new EncryptJWT({
    refresh_token: payload.refreshToken,
    ...(payload.scope ? { scope: payload.scope } : {}),
  })
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      typ: TOKEN_TYP,
      kid: tokenKey.kid,
      jti,
      iat,
    })
    .setSubject(payload.sub)
    .setJti(jti)
    .setIssuedAt(iat)
    .setExpirationTime(exp);

  return jwt.encrypt(tokenKey.key);
}

export function isExpiredEncryptedTokenError(error: unknown) {
  return error instanceof errors.JWTExpired;
}

export async function decryptRefreshToken(
  token: string,
): Promise<DecryptedRefreshToken> {
  const store = getHealthSecretStore();
  const { payload, protectedHeader } = await jwtDecrypt<RefreshTokenClaims>(
    token,
    async (header) => (await store.getKeyById(header.kid)).key,
    {
      typ: TOKEN_TYP,
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
      requiredClaims: ["sub", "refresh_token", "iat", "exp"],
    },
  );

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("encrypted token is missing sub");
  }

  if (
    typeof payload.refresh_token !== "string" ||
    payload.refresh_token.length === 0
  ) {
    throw new Error("encrypted token is missing refresh_token");
  }

  if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat)) {
    throw new Error("encrypted token is missing iat");
  }

  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
    throw new Error("encrypted token is missing exp");
  }

  const jti =
    typeof payload.jti === "string" && payload.jti.length > 0
      ? payload.jti
      : typeof protectedHeader.jti === "string" && protectedHeader.jti.length > 0
        ? protectedHeader.jti
        : undefined;

  if (!jti) {
    throw new Error("encrypted token is missing jti");
  }

  return {
    sub: payload.sub,
    refreshToken: payload.refresh_token,
    scope: typeof payload.scope === "string" ? payload.scope : undefined,
    jti,
    iat: payload.iat,
    exp: payload.exp,
  };
}
