import { FetchHeaderError, TokenValidationError } from "@/server/auth/errors";
import { isValidSession } from "@/server/auth/require-session";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";
import { sessionCookieRequestHeader } from "@/server/auth/session-cookie";
import {
  signSessionToken,
  verifySessionToken,
} from "@/server/auth/session-token";

function sessionRequest(headers: HeadersInit = {}) {
  return new Request("http://localhost:3000/auth/health/access", {
    headers: {
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
  });
}

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

  it("rejects requests that are not same-origin", async () => {
    await expect(
      isValidSession(
        sessionRequest({
          "Sec-Fetch-Site": "cross-site",
        }),
      ),
    ).rejects.toBeInstanceOf(FetchHeaderError);
  });

  it("rejects requests without a session cookie", async () => {
    await expect(isValidSession(sessionRequest())).rejects.toMatchObject({
      name: "TokenValidationError",
      message: "missing session token",
    });
  });

  it("accepts a signed session token", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await isValidSession(
      sessionRequest({ Cookie: sessionCookieRequestHeader(sessionToken) }),
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
        sessionRequest({ Cookie: sessionCookieRequestHeader(sessionToken) }),
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
        sessionRequest({ Cookie: sessionCookieRequestHeader(sessionToken) }),
      ),
    ).rejects.toBeInstanceOf(TokenValidationError);
  });

  it("accepts a session token issued at or after a sub watermark", async () => {
    const sessionToken = await signSessionToken({ sub: "user-1" });
    const session = await verifySessionToken(sessionToken);
    const revocationDatabase = await getRevocationDatabase();
    await revocationDatabase.invalidateIssuedBefore(session.sub, session.iat);

    const verified = await isValidSession(
      sessionRequest({ Cookie: sessionCookieRequestHeader(sessionToken) }),
    );

    expect(verified.sub).toBe("user-1");
  });
});
