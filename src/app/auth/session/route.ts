import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import {
  badRequestResponse,
  jsonResponse,
  unauthorizedResponse,
} from "@/server/auth/http";
import { requireSameOrigin } from "@/server/auth/require-session";
import { signSessionToken } from "@/server/auth/session-token";

interface CreateSessionBody {
  idToken?: unknown;
}

/**
 * Create a new session token for the user from a Google OpenID Connect token
 */
export async function POST(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  let body: CreateSessionBody;

  try {
    body = (await request.json()) as CreateSessionBody;
  } catch {
    return badRequestResponse("invalid json body");
  }

  if (typeof body.idToken !== "string" || body.idToken.length === 0) {
    return badRequestResponse("missing idToken");
  }

  let claims;

  try {
    claims = await verifyGoogleIdToken(body.idToken);
  } catch (error) {
    console.error({
      message: "error verifying google id token",
    });
    return unauthorizedResponse("invalid idToken");
  }

  const sessionToken = await signSessionToken({ sub: claims.sub });

  return jsonResponse({ sessionToken });
}
