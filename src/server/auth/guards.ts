import { getAllowedOrigins } from "./env";

export function getProxyRequestError(request: Request) {
  if (request.headers.get("Sec-Fetch-Site") !== "same-origin") {
    return "request must be same-origin";
  }

  const origin = request.headers.get("Origin");

  if (!origin) {
    return "missing Origin header";
  }

  if (!getAllowedOrigins().includes(origin)) {
    return "origin is not allowed";
  }

  return undefined;
}

export function isAllowedRedirectUri(redirectUri: string) {
  return getAllowedOrigins().includes(redirectUri);
}
