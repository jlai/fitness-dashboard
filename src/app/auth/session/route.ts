import { TokenValidationError } from "@/server/auth/errors";
import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import {
  getHTTPErrorResponse,
  jsonResponse,
  readJsonBody,
} from "@/server/auth/http";
import { createSessionBodySchema } from "@/server/auth/request-bodies";
import { validateSecFetch } from "@/server/auth/require-session";
import { signSessionToken } from "@/server/auth/session-token";

/**
 * Create a new session token for the user from a Google OpenID Connect token
 */
export async function POST(request: Request) {
  try {
    validateSecFetch(request);
    const { idToken } = await readJsonBody(request, createSessionBodySchema);

    let claims;

    try {
      claims = await verifyGoogleIdToken(idToken);
    } catch {
      console.error({
        message: "error verifying google id token",
      });
      throw new TokenValidationError("invalid idToken");
    }

    const sessionToken = await signSessionToken({ sub: claims.sub });

    return jsonResponse({ sessionToken });
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}
