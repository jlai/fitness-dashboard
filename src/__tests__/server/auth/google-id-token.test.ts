import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";

import { verifyGoogleIdToken } from "@/server/auth/google-id-token";

const CLIENT_ID = "web-client-id";
const KEY_ID = "test-kid";

describe("verifyGoogleIdToken", () => {
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
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
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ keys: [jwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = originalClientId;
    jest.restoreAllMocks();
  });

  async function signIdToken(
    claims: ConstructorParameters<typeof SignJWT>[0] = {},
    header: { kid?: string } = {},
  ) {
    const now = Math.floor(Date.now() / 1000);

    return new SignJWT(claims)
      .setProtectedHeader({
        alg: "RS256",
        kid: header.kid ?? KEY_ID,
        typ: "JWT",
      })
      .setIssuer("https://accounts.google.com")
      .setAudience(CLIENT_ID)
      .setSubject("user-1")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);
  }

  it("verifies a Google ID token and returns sub and email", async () => {
    const idToken = await signIdToken({ email: "user@example.com" });

    await expect(verifyGoogleIdToken(idToken)).resolves.toEqual({
      sub: "user-1",
      email: "user@example.com",
    });
  });

  it("throws when the client id is missing", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
    const idToken = await signIdToken();

    await expect(verifyGoogleIdToken(idToken)).rejects.toThrow(
      "NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID is not configured",
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("throws when the token is missing sub", async () => {
    const now = Math.floor(Date.now() / 1000);
    const idToken = await new SignJWT({ email: "user@example.com" })
      .setProtectedHeader({ alg: "RS256", kid: KEY_ID, typ: "JWT" })
      .setIssuer("https://accounts.google.com")
      .setAudience(CLIENT_ID)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    await expect(verifyGoogleIdToken(idToken)).rejects.toThrow(
      "openid token is missing sub",
    );
  });

  it("rejects a token whose kid is not in Google's JWKS", async () => {
    const idToken = await signIdToken({}, { kid: "unknown-kid" });

    await expect(verifyGoogleIdToken(idToken)).rejects.toThrow();
  });
});
