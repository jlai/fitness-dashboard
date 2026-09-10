import { EncryptJWT, jwtDecrypt } from "jose";

import { getRefreshTokenKey, resolveRefreshTokenKey } from "./env";

export interface EncryptedRefreshTokenPayload {
  sub: string;
  refreshToken: string;
  scope?: string;
}

const TOKEN_TYP = "refresh+jwt";

interface RefreshTokenClaims {
  refresh_token?: unknown;
  scope?: unknown;
}

export async function encryptRefreshToken(
  payload: EncryptedRefreshTokenPayload,
) {
  const tokenKey = getRefreshTokenKey();
  const jwt = new EncryptJWT({
    refresh_token: payload.refreshToken,
    ...(payload.scope ? { scope: payload.scope } : {}),
  })
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      typ: TOKEN_TYP,
      kid: tokenKey.kid,
    })
    .setSubject(payload.sub)
    .setIssuedAt();

  return jwt.encrypt(tokenKey.key);
}

export async function decryptRefreshToken(
  token: string,
): Promise<EncryptedRefreshTokenPayload> {
  const { payload } = await jwtDecrypt<RefreshTokenClaims>(
    token,
    (header) => resolveRefreshTokenKey(header.kid).key,
    {
      typ: TOKEN_TYP,
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
      requiredClaims: ["sub", "refresh_token"],
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

  return {
    sub: payload.sub,
    refreshToken: payload.refresh_token,
    scope: typeof payload.scope === "string" ? payload.scope : undefined,
  };
}
