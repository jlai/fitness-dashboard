import { TokenValidationError } from "@/server/auth/errors";
import { isValidSession } from "@/server/auth/require-session";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import {
  signSessionToken,
  verifySessionToken,
} from "@/server/auth/session-token";

describe("isValidSession", () => {
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;

  beforeEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
  });

  afterEach(() => {
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
  });

  it("accepts a signed session token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await isValidSession(
      new Request("http://localhost:3000/auth/health/access", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }),
    );

    expect(session.sub).toBe("user-1");
  });

  it("rejects a revoked session token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await verifySessionToken(sessionToken);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.add(session.jti, session.exp);

    await expect(
      isValidSession(
        new Request("http://localhost:3000/auth/health/access", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
      ),
    ).rejects.toMatchObject({
      name: "TokenValidationError",
      message: "session token has been revoked",
    });
  });

  it("rejects a session token issued before a sub watermark", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await verifySessionToken(sessionToken);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.invalidateIssuedBefore(
      session.sub,
      session.iat + 1,
    );

    await expect(
      isValidSession(
        new Request("http://localhost:3000/auth/health/access", {
          headers: { Authorization: `Bearer ${sessionToken}` },
        }),
      ),
    ).rejects.toBeInstanceOf(TokenValidationError);
  });

  it("accepts a session token issued at or after a sub watermark", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await verifySessionToken(sessionToken);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.invalidateIssuedBefore(session.sub, session.iat);

    const verified = await isValidSession(
      new Request("http://localhost:3000/auth/health/access", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }),
    );

    expect(verified.sub).toBe("user-1");
  });
});
