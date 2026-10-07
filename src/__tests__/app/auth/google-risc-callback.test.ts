import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";

import { POST } from "@/app/auth/google/risc/callback/route";
import {
  RISC_CONFIGURATION_URI,
  resetRiscConfigurationCache,
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

describe("POST /auth/google/risc/callback", () => {
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

  async function signSecurityEventToken(sub: string, iat: number) {
    return new SignJWT({
      events: {
        [ACCOUNT_DISABLED_EVENT]: {
          subject: {
            subject_type: "iss-sub",
            iss: ISSUER,
            sub,
          },
          reason: "hijacking",
        },
      },
    })
      .setProtectedHeader({
        alg: "RS256",
        kid: KEY_ID,
        typ: "secevent+jwt",
      })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setIssuedAt(iat)
      .setJti("event-1")
      .sign(privateKey);
  }

  function makeRequest(body: string, contentType = "application/secevent+jwt") {
    return new Request("http://localhost:3000/auth/google/risc/callback", {
      method: "POST",
      headers: {
        "Content-Type": contentType,
      },
      body,
    });
  }

  it("accepts a valid security event token and revokes the subject before now", async () => {
    const before = Math.floor(Date.now() / 1000) - 1;
    const token = await signSecurityEventToken(
      "user-1",
      Math.floor(Date.now() / 1000),
    );

    const response = await POST(makeRequest(token));

    expect(response.status).toBe(202);
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, max-age=0, must-revalidate",
    );

    const after = Math.floor(Date.now() / 1000) + 1;
    const revocationDatabase = await getRevocationDatabase();
    await expect(
      revocationDatabase.isRevoked({
        jti: "session-1",
        sub: "user-1",
        iat: before,
      }),
    ).resolves.toBe(true);
    await expect(
      revocationDatabase.isRevoked({
        jti: "session-2",
        sub: "user-1",
        iat: after,
      }),
    ).resolves.toBe(false);
  });

  it("returns 400 for an empty body", async () => {
    const response = await POST(makeRequest(""));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "missing security event token",
    });
  });

  it("returns 400 for an invalid security event token", async () => {
    const response = await POST(makeRequest("not-a-jwt"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_request",
      errorDescription: "invalid security event token",
    });
  });
});
