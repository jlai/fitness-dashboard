import {
  isValidSession,
  requireSameOrigin,
} from "@/server/auth/require-session";
import { getRevocationDatabase } from "@/server/auth/revocation-database";

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
