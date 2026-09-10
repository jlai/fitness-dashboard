import { decodeProtectedHeader, SignJWT } from "jose";
import { jwtDecode } from "jwt-decode";

import {
  getSessionTokenKey,
  getSiteTokenDefaultExpirationSeconds,
} from "@/server/auth/env";
import {
  SESSION_TOKEN_TYP,
  signSessionToken,
  verifySessionToken,
} from "@/server/auth/session-token";

describe("signed session token", () => {
  const originalKey = process.env.SESSION_TOKEN_JWK;
  const originalExpiration = process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;

  beforeEach(() => {
    delete process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES;
  });

  afterEach(() => {
    process.env.SESSION_TOKEN_JWK = originalKey;
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = originalExpiration;
  });

  it("signs a JWT with sub, iat, exp, and a random jti", async () => {
    const before = Math.floor(Date.now() / 1000);
    const jwt = await signSessionToken({ sub: "user-123" });
    const after = Math.floor(Date.now() / 1000);
    const claims = jwtDecode<{
      sub: string;
      iat: number;
      exp: number;
      jti: string;
    }>(jwt);

    expect(jwt.split(".")).toHaveLength(3);
    expect(decodeProtectedHeader(jwt).kid).toBe("session-test-1");
    expect(claims.sub).toBe("user-123");
    expect(claims.iat).toBeGreaterThanOrEqual(before);
    expect(claims.iat).toBeLessThanOrEqual(after);
    expect(claims.exp).toBe(claims.iat + 120 * 60);
    expect(claims.jti).toEqual(expect.any(String));
    expect(claims.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );

    await expect(verifySessionToken(jwt)).resolves.toEqual({
      sub: "user-123",
      iat: claims.iat,
      exp: claims.exp,
      jti: claims.jti,
    });
  });

  it("gives each session token a unique jti", async () => {
    const first = jwtDecode<{ jti: string }>(
      await signSessionToken({ sub: "user-123" }),
    );
    const second = jwtDecode<{ jti: string }>(
      await signSessionToken({ sub: "user-123" }),
    );

    expect(first.jti).not.toBe(second.jti);
  });

  it("uses SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES when set", async () => {
    process.env.SITE_TOKEN_DEFAULT_EXPIRATION_MINUTES = "30";
    const jwt = await signSessionToken({ sub: "user-123" });
    const claims = jwtDecode<{ iat: number; exp: number }>(jwt);

    expect(claims.exp).toBe(claims.iat + 30 * 60);
    expect(getSiteTokenDefaultExpirationSeconds()).toBe(30 * 60);
  });

  it("rejects a malformed token", async () => {
    await expect(verifySessionToken("not-a-jwt")).rejects.toThrow();
  });

  it("rejects an expired session token", async () => {
    const jwt = await signSessionToken({
      sub: "user-123",
      iat: 1_000,
      exp: 1_001,
    });

    await expect(verifySessionToken(jwt)).rejects.toThrow();
  });

  it("rejects a session token without jti", async () => {
    const tokenKey = getSessionTokenKey();
    const jwt = await new SignJWT({})
      .setProtectedHeader({
        alg: "HS256",
        typ: SESSION_TOKEN_TYP,
        kid: tokenKey.kid,
      })
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(tokenKey.key);

    await expect(verifySessionToken(jwt)).rejects.toThrow(
      "session token is missing jti",
    );
  });

  it("verifies tokens minted with a previous key after rotation", async () => {
    const jwt = await signSessionToken({ sub: "user-123" });

    process.env.SESSION_TOKEN_JWK = JSON.stringify({
      keys: [
        {
          kty: "oct",
          kid: "session-test-2",
          alg: "HS256",
          k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
        },
        {
          kty: "oct",
          kid: "session-test-1",
          alg: "HS256",
          k: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        },
      ],
    });

    await expect(verifySessionToken(jwt)).resolves.toMatchObject({
      sub: "user-123",
    });

    const rotated = await signSessionToken({ sub: "user-123" });
    expect(decodeProtectedHeader(rotated).kid).toBe("session-test-2");
  });
});
