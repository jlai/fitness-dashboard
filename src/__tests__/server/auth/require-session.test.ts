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
    const result = await isValidSession(
      new Request("http://localhost:3000/auth/health/access", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }),
    );

    expect(result.error).toBeUndefined();
    expect(result.session?.sub).toBe("user-1");
  });

  it("rejects a revoked session token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await verifySessionToken(sessionToken);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.add(session.jti, session.exp);

    const result = await isValidSession(
      new Request("http://localhost:3000/auth/health/access", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      }),
    );

    expect(result.session).toBeUndefined();
    expect(result.error?.status).toBe(401);
    await expect(result.error?.json()).resolves.toEqual({
      error: "unauthorized",
      error_description: "session token has been revoked",
    });
  });
});
