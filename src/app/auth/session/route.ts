import { verifyGoogleIdToken } from "@/server/auth/google-id-token";
import {
  badRequestResponse,
  jsonResponse,
  unauthorizedResponse,
} from "@/server/auth/http";
import {
  isValidSession,
  requireSameOrigin,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";
import { signSessionToken } from "@/server/auth/session-token";

interface CreateSessionBody {
  id_token?: unknown;
}

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

  if (typeof body.id_token !== "string" || body.id_token.length === 0) {
    return badRequestResponse("missing id_token");
  }

  let claims;

  try {
    claims = await verifyGoogleIdToken(body.id_token);
  } catch (error) {
    console.error("error verifying google id token", error instanceof Error ? error.message : String(error));
    return unauthorizedResponse("invalid id_token");
  }

  const session_token = await signSessionToken({ sub: claims.sub });

  return jsonResponse({ session_token });
}

export async function DELETE(request: Request) {
  const origin = requireSameOrigin(request);

  if (origin.error) {
    return origin.error;
  }

  const auth = await isValidSession(request);

  if (auth.error) {
    return auth.error;
  }

  const revocationDatabase = await getRevocationDatabase();
  await revocationDatabase.add(auth.session.jti, auth.session.exp);

  return new Response(null, { status: 204 });
}
