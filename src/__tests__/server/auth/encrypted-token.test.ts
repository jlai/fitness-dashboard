import { decodeProtectedHeader } from "jose";

import {
  decryptRefreshToken,
  encryptRefreshToken,
} from "@/server/auth/encrypted-token";

describe("encrypted refresh token", () => {
  const originalKey = process.env.REFRESH_TOKEN_JWK;

  afterEach(() => {
    process.env.REFRESH_TOKEN_JWK = originalKey;
  });

  it("round-trips the refresh token and subject", async () => {
    const before = Math.floor(Date.now() / 1000);
    const jwt = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "rtok",
      scope:
        "openid https://www.googleapis.com/auth/googlehealth.profile.readonly",
    });
    const after = Math.floor(Date.now() / 1000);
    const header = decodeProtectedHeader(jwt);

    expect(jwt.split(".")).toHaveLength(5);
    expect(header.kid).toBe("refresh-test-1");
    expect(header.jti).toEqual(expect.any(String));
    expect(header.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(header.iat).toBeGreaterThanOrEqual(before);
    expect(header.iat).toBeLessThanOrEqual(after);
    await expect(decryptRefreshToken(jwt)).resolves.toEqual({
      sub: "user-123",
      refreshToken: "rtok",
      scope:
        "openid https://www.googleapis.com/auth/googlehealth.profile.readonly",
    });
  });

  it("gives each encrypted token a unique jti", async () => {
    const first = decodeProtectedHeader(
      await encryptRefreshToken({
        sub: "user-123",
        refreshToken: "rtok",
      }),
    );
    const second = decodeProtectedHeader(
      await encryptRefreshToken({
        sub: "user-123",
        refreshToken: "rtok",
      }),
    );

    expect(first.jti).not.toBe(second.jti);
  });

  it("is opaque to the client (not a readable JWT payload)", async () => {
    const jwt = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "super-secret-refresh-token",
    });

    const parts = jwt.split(".");
    expect(parts).toHaveLength(5);
    expect(Buffer.from(parts[0], "base64url").toString()).not.toContain(
      "super-secret-refresh-token",
    );
  });

  it("rejects a malformed token", async () => {
    await expect(decryptRefreshToken("not-a-jwt")).rejects.toThrow();
  });

  it("decrypts tokens minted with a previous key after rotation", async () => {
    const jwt = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "rtok",
    });

    process.env.REFRESH_TOKEN_JWK = JSON.stringify({
      keys: [
        {
          kty: "oct",
          kid: "refresh-test-2",
          alg: "A256GCM",
          k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
        },
        {
          kty: "oct",
          kid: "refresh-test-1",
          alg: "A256GCM",
          k: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
        },
      ],
    });

    await expect(decryptRefreshToken(jwt)).resolves.toEqual({
      sub: "user-123",
      refreshToken: "rtok",
    });

    const rotated = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "rtok",
    });
    expect(decodeProtectedHeader(rotated).kid).toBe("refresh-test-2");
  });
});
