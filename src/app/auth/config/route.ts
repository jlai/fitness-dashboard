import { getConfiguredClientId } from "@/server/auth/env";
import { getHTTPErrorResponse, jsonResponse } from "@/server/auth/http";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return jsonResponse({ googleClientId: getConfiguredClientId() });
  } catch (error) {
    return getHTTPErrorResponse(error);
  }
}
