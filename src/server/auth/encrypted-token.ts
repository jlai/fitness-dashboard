import { EncryptJWT, errors, jwtDecrypt } from "jose";

import {
  ENCRYPTED_DRIVE_TOKEN_EXPIRATION_SECONDS,
  ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS,
} from "@/config/encrypted-token";

import { GoogleTokenEndpointError, TokenValidationError } from "./errors";
import { getDriveSecretStore, getHealthSecretStore } from "./get-secret-store";
import { revokeGoogleToken } from "./google-oauth-token";
import { getRevocationDatabase } from "./revocation-database";
import type { SecretStore } from "./secret-store";

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

type RefreshTokenKind = "health" | "drive";

const TOKEN_KIND_CONFIG: Record<
  RefreshTokenKind,
  {
    typ: string;
    expirationSeconds: number;
    getStore: () => SecretStore;
  }
> = {
  health: {
    typ: "refresh+jwt",
    expirationSeconds: ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS,
    getStore: getHealthSecretStore,
  },
  drive: {
    typ: "drive-refresh+jwt",
    expirationSeconds: ENCRYPTED_DRIVE_TOKEN_EXPIRATION_SECONDS,
    getStore: getDriveSecretStore,
  },
};

interface RefreshTokenClaims {
  refresh_token?: unknown;
  scope?: unknown;
}

async function encryptRefreshTokenFor(
  kind: RefreshTokenKind,
  payload: EncryptedRefreshTokenPayload,
) {
  const config = TOKEN_KIND_CONFIG[kind];
  const tokenKey = await config.getStore().getActiveKey();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + config.expirationSeconds;
  const jti = crypto.randomUUID();
  const jwt = new EncryptJWT({
    refresh_token: payload.refreshToken,
    ...(payload.scope ? { scope: payload.scope } : {}),
  })
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
      typ: config.typ,
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

export async function encryptRefreshToken(
  payload: EncryptedRefreshTokenPayload,
) {
  return encryptRefreshTokenFor("health", payload);
}

export async function encryptDriveRefreshToken(
  payload: EncryptedRefreshTokenPayload,
) {
  return encryptRefreshTokenFor("drive", payload);
}

async function decryptRefreshTokenFor(
  kind: RefreshTokenKind,
  token: string,
): Promise<DecryptedRefreshToken> {
  const config = TOKEN_KIND_CONFIG[kind];
  const store = config.getStore();
  const { payload, protectedHeader } = await jwtDecrypt<RefreshTokenClaims>(
    token,
    async (header) => (await store.getKeyById(header.kid)).key,
    {
      typ: config.typ,
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
      : typeof protectedHeader.jti === "string" &&
          protectedHeader.jti.length > 0
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

export async function decryptHealthRefreshToken(
  token: string,
): Promise<DecryptedRefreshToken> {
  return decryptRefreshTokenFor("health", token);
}

export async function decryptDriveRefreshToken(
  token: string,
): Promise<DecryptedRefreshToken> {
  return decryptRefreshTokenFor("drive", token);
}

async function decryptTokenForSession(options: {
  encrypted: string;
  sessionSub: string;
  decrypt: (token: string) => Promise<DecryptedRefreshToken>;
}): Promise<DecryptedRefreshToken> {
  let verified: DecryptedRefreshToken;

  try {
    verified = await options.decrypt(options.encrypted);
  } catch (error) {
    if (error instanceof errors.JWTExpired) {
      throw new TokenValidationError("encrypted token has expired");
    }

    throw new TokenValidationError("invalid encrypted token");
  }

  if (verified.sub !== options.sessionSub) {
    throw new TokenValidationError("session does not match encrypted token");
  }

  return verified;
}

/**
 * Decrypt an encrypted health/drive token for this session and reject it when
 * expired or revoked.
 */
export async function isValidEncryptedToken(options: {
  encrypted: string;
  sessionSub: string;
  decrypt: (token: string) => Promise<DecryptedRefreshToken>;
}): Promise<DecryptedRefreshToken> {
  const verified = await decryptTokenForSession(options);
  const revocationDatabase = await getRevocationDatabase();

  if (
    await revocationDatabase.isRevoked({
      jti: verified.jti,
      sub: verified.sub,
      iat: verified.iat,
    })
  ) {
    throw new TokenValidationError("encrypted token has been revoked");
  }

  return verified;
}

export async function decryptHealthTokenForSession(
  encrypted: string,
  sessionSub: string,
): Promise<DecryptedRefreshToken> {
  return decryptTokenForSession({
    encrypted,
    sessionSub,
    decrypt: decryptHealthRefreshToken,
  });
}

export async function decryptDriveTokenForSession(
  encrypted: string,
  sessionSub: string,
): Promise<DecryptedRefreshToken> {
  return decryptTokenForSession({
    encrypted,
    sessionSub,
    decrypt: decryptDriveRefreshToken,
  });
}

export async function denylistStoredToken(verified: DecryptedRefreshToken) {
  const revocationDatabase = await getRevocationDatabase();
  await revocationDatabase.add(verified.jti, verified.exp);
}

export async function revokeGoogleRefreshToken(
  refreshToken: string,
): Promise<void> {
  const { status } = await revokeGoogleToken(refreshToken);

  if (status !== 200) {
    throw new GoogleTokenEndpointError(
      "token_revoke_failed",
      "refresh token revocation failed",
    );
  }
}

export async function revokeAndDenylistStoredToken(
  verified: DecryptedRefreshToken,
): Promise<void> {
  await denylistStoredToken(verified);
  await revokeGoogleRefreshToken(verified.refreshToken);
}
