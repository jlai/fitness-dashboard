import { decodeProtectedHeader } from "jose";

import { resetSecretStores } from "@/server/auth/env";
import {
  decryptDriveRefreshToken,
  decryptRefreshToken,
  encryptDriveRefreshToken,
  encryptRefreshToken,
  ENCRYPTED_DRIVE_TOKEN_EXPIRATION_SECONDS,
  ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS,
} from "@/server/auth/encrypted-token";

describe("encrypted refresh token", () => {
  const originalKey = process.env.HEALTH_ACTIVE_KEY;
  const originalAccepted = process.env.HEALTH_ACCEPTED_KEYS;

  beforeEach(() => {
    delete process.env.HEALTH_ACCEPTED_KEYS;
    resetSecretStores();
  });

  afterEach(() => {
    process.env.HEALTH_ACTIVE_KEY = originalKey;
    process.env.HEALTH_ACCEPTED_KEYS = originalAccepted;
    resetSecretStores();
    jest.useRealTimers();
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
      jti: header.jti,
      iat: header.iat,
      exp: (header.iat as number) + ENCRYPTED_HEALTH_TOKEN_EXPIRATION_SECONDS,
    });
  });

  it("rejects an expired encrypted token", async () => {
    jest.useFakeTimers({ now: new Date("2020-01-01T00:00:00Z") });
    const jwt = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "rtok",
    });

    jest.setSystemTime(new Date("2020-01-20T00:00:00Z"));

    await expect(decryptRefreshToken(jwt)).rejects.toThrow();
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
    const current = {
      kty: "oct",
      kid: "refresh-test-2",
      alg: "A256GCM",
      k: "AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI",
    };
    const previous = {
      kty: "oct",
      kid: "refresh-test-1",
      alg: "A256GCM",
      k: "AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
    };

    process.env.HEALTH_ACTIVE_KEY = JSON.stringify(current);
    process.env.HEALTH_ACCEPTED_KEYS = JSON.stringify({
      keys: [current, previous],
    });
    resetSecretStores();

    await expect(decryptRefreshToken(jwt)).resolves.toEqual({
      sub: "user-123",
      refreshToken: "rtok",
      jti: expect.any(String),
      iat: expect.any(Number),
      exp: expect.any(Number),
    });

    const rotated = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "rtok",
    });
    expect(decodeProtectedHeader(rotated).kid).toBe("refresh-test-2");
  });
});

describe("encrypted drive refresh token", () => {
  const originalKey = process.env.DRIVE_ACTIVE_KEY;
  const originalAccepted = process.env.DRIVE_ACCEPTED_KEYS;

  beforeEach(() => {
    delete process.env.DRIVE_ACCEPTED_KEYS;
    resetSecretStores();
  });

  afterEach(() => {
    process.env.DRIVE_ACTIVE_KEY = originalKey;
    process.env.DRIVE_ACCEPTED_KEYS = originalAccepted;
    resetSecretStores();
  });

  it("round-trips with drive-refresh+jwt typ and drive keys", async () => {
    const jwt = await encryptDriveRefreshToken({
      sub: "user-123",
      refreshToken: "drive-rtok",
      scope: "https://www.googleapis.com/auth/drive.appdata",
    });
    const header = decodeProtectedHeader(jwt);

    expect(header.typ).toBe("drive-refresh+jwt");
    expect(header.kid).toBe("drive-test-1");
    await expect(decryptDriveRefreshToken(jwt)).resolves.toEqual({
      sub: "user-123",
      refreshToken: "drive-rtok",
      scope: "https://www.googleapis.com/auth/drive.appdata",
      jti: header.jti,
      iat: header.iat,
      exp: (header.iat as number) + ENCRYPTED_DRIVE_TOKEN_EXPIRATION_SECONDS,
    });
  });

  it("rejects health tokens on the drive decrypt path", async () => {
    const healthJwt = await encryptRefreshToken({
      sub: "user-123",
      refreshToken: "rtok",
    });

    await expect(decryptDriveRefreshToken(healthJwt)).rejects.toThrow();
  });

  it("rejects drive tokens on the health decrypt path", async () => {
    const driveJwt = await encryptDriveRefreshToken({
      sub: "user-123",
      refreshToken: "drive-rtok",
    });

    await expect(decryptRefreshToken(driveJwt)).rejects.toThrow();
  });
});
