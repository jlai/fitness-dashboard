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

  const issuedBefore = Math.floor(Date.now() / 1000);
  const revocationDatabase = await getRevocationDatabase();
  await revocationDatabase.invalidateIssuedBefore(
    auth.session.sub,
    issuedBefore,
  );

  return new Response(null, { status: 204 });
}
