import {
  acceptedResponse,
  badRequestResponse,
  getHTTPErrorResponse,
} from "@/server/auth/http";
import { handleRiscSecurityEventToken } from "@/server/auth/risc";

/**
 * Receive Google Cross-Account Protection (RISC) security event tokens.
 * Valid tokens return HTTP 202; invalid tokens return HTTP 400.
 *
 * Register this HTTPS URL with the RISC stream configuration API:
 * https://developers.google.com/identity/protocols/risc
 */
export async function POST(request: Request) {
  try {
    const token = (await request.text()).trim();

    if (!token) {
      return badRequestResponse("missing security event token");
    }

    await handleRiscSecurityEventToken(token);

    return acceptedResponse();
  } catch (error) {
    return getHTTPErrorResponse(error, "error handling security event token");
  }
}
