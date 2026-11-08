import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";

import {
  RISC_CONFIGURATION_URI,
  RISC_VERIFICATION_EVENT_TYPE,
  applyRiscSecurityEvents,
  resetRiscConfigurationCache,
  verifyRiscSecurityEventToken,
} from "@/server/auth/risc";
import {
  getRevocationDatabase,
  resetRevocationDatabase,
} from "@/server/auth/revocation-database";

const CLIENT_ID = "web-client-id";
const KEY_ID = "test-kid";
const ISSUER = "https://accounts.google.com";
const JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ACCOUNT_DISABLED_EVENT =
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled";
const SESSIONS_REVOKED_EVENT =
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked";

describe("RISC security event tokens", () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  const originalRevocation = process.env.SESSION_REVOCATION_DATABASE;
  let privateKey: CryptoKey;
  let jwk: JWK;

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256", { extractable: true });
    privateKey = pair.privateKey;
    jwk = await exportJWK(pair.publicKey);
    jwk.kid = KEY_ID;
    jwk.alg = "RS256";
    jwk.use = "sig";
  });

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = CLIENT_ID;
    process.env.SESSION_REVOCATION_DATABASE = "memory://";
    resetRevocationDatabase();
    resetRiscConfigurationCache();
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url === RISC_CONFIGURATION_URI) {
        return new Response(
          JSON.stringify({
            issuer: ISSUER,
            jwks_uri: JWKS_URI,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url === JWKS_URI) {
        return new Response(JSON.stringify({ keys: [jwk] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response("not found", { status: 404 });
    });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = originalClientId;
    process.env.SESSION_REVOCATION_DATABASE = originalRevocation;
    resetRevocationDatabase();
    resetRiscConfigurationCache();
    jest.restoreAllMocks();
  });

  async function signSecurityEventToken({
    events,
    iat = Math.floor(Date.now() / 1000),
    audience = CLIENT_ID,
    issuer = ISSUER,
    kid = KEY_ID,
    includeExp = false,
  }: {
    events: Record<string, unknown>;
    iat?: number;
    audience?: string;
    issuer?: string;
    kid?: string;
    includeExp?: boolean;
  }) {
    let jwt = new SignJWT({ events })
      .setProtectedHeader({
        alg: "RS256",
        kid,
        typ: "secevent+jwt",
      })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(iat)
      .setJti("event-1");

    if (includeExp) {
      // Expired, but still after iat so the token shape stays valid.
      jwt = jwt.setExpirationTime(iat + 60);
    }

    return jwt.sign(privateKey);
  }

  function accountDisabledEvent(sub: string) {
    return {
      [ACCOUNT_DISABLED_EVENT]: {
        subject: {
          subject_type: "iss-sub",
          iss: ISSUER,
          sub,
        },
        reason: "hijacking",
      },
    };
  }

  it("verifies a security event token against the RISC configuration", async () => {
    const iat = Math.floor(Date.now() / 1000) - 120;
    const token = await signSecurityEventToken({
      events: accountDisabledEvent("user-1"),
      iat,
    });

    await expect(verifyRiscSecurityEventToken(token)).resolves.toMatchObject({
      iss: ISSUER,
      aud: CLIENT_ID,
      iat,
      jti: "event-1",
    });
  });

  it("accepts historical tokens even when exp is in the past", async () => {
    const iat = Math.floor(Date.now() / 1000) - 3600;
    const token = await signSecurityEventToken({
      events: accountDisabledEvent("user-1"),
      iat,
      includeExp: true,
    });

    await expect(verifyRiscSecurityEventToken(token)).resolves.toMatchObject({
      iat,
    });
  });

  it("rejects tokens with the wrong audience", async () => {
    const token = await signSecurityEventToken({
      events: accountDisabledEvent("user-1"),
      audience: "other-client",
    });

    await expect(verifyRiscSecurityEventToken(token)).rejects.toThrow(
      "invalid security event token",
    );
  });

  it("rejects tokens signed with an unknown kid", async () => {
    const token = await signSecurityEventToken({
      events: accountDisabledEvent("user-1"),
      kid: "unknown-kid",
    });

    await expect(verifyRiscSecurityEventToken(token)).rejects.toThrow(
      "invalid security event token",
    );
  });

  it("invalidates sessions issued before now for each subject", async () => {
    const before = Math.floor(Date.now() / 1000) - 1;
    await applyRiscSecurityEvents({
      events: {
        ...accountDisabledEvent("user-1"),
        [SESSIONS_REVOKED_EVENT]: {
          subject: {
            subject_type: "iss-sub",
            iss: ISSUER,
            sub: "user-2",
          },
        },
      },
    });
    const after = Math.floor(Date.now() / 1000) + 1;

    const revocationDatabase = await getRevocationDatabase();

    await expect(
      revocationDatabase.isRevoked({
        jti: "jti-1",
        sub: "user-1",
        iat: before,
      }),
    ).resolves.toBe(true);
    await expect(
      revocationDatabase.isRevoked({
        jti: "jti-2",
        sub: "user-1",
        iat: after,
      }),
    ).resolves.toBe(false);
    await expect(
      revocationDatabase.isRevoked({
        jti: "jti-3",
        sub: "user-2",
        iat: before,
      }),
    ).resolves.toBe(true);
  });

  it("deduplicates subject ids when multiple events share a sub", async () => {
    const revocationDatabase = await getRevocationDatabase();
    const invalidateSpy = jest.spyOn(
      revocationDatabase,
      "invalidateIssuedBeforeNow",
    );

    await applyRiscSecurityEvents({
      events: {
        ...accountDisabledEvent("user-1"),
        [SESSIONS_REVOKED_EVENT]: {
          subject: {
            subject_type: "iss-sub",
            iss: ISSUER,
            sub: "user-1",
          },
        },
      },
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith("user-1");
  });

  it("does not revoke subjects for verification events", async () => {
    const iat = Math.floor(Date.now() / 1000);
    await applyRiscSecurityEvents({
      iat,
      events: {
        [RISC_VERIFICATION_EVENT_TYPE]: {
          state: "test-nonce",
        },
      },
    });

    const revocationDatabase = await getRevocationDatabase();

    await expect(
      revocationDatabase.isRevoked({
        jti: "jti-1",
        sub: "user-1",
        iat: iat - 1,
      }),
    ).resolves.toBe(false);
  });
});
