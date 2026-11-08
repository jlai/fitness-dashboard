import { createRemoteJWKSet, jwtVerify } from "jose";

import { getConfiguredClientId } from "./env";

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Normally we should use google-auth-library's verifyIdToken to verify
// the id token, but it has issues running on Cloudflare Workers (apparently
// due to not refreshing certs correctly)
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export interface GoogleIdTokenClaims {
  sub: string;
  email?: string;
}

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdTokenClaims> {
  const audience = getConfiguredClientId();
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience,
    algorithms: ["RS256", "ES256"],
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("openid token is missing sub");
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
