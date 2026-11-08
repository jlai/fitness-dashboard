import { NextRequest, NextResponse } from "next/server";

import {
  CONTENT_SECURITY_POLICY_HEADER,
  buildContentSecurityPolicy,
} from "./config/content-security-policy";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CONTENT_SECURITY_POLICY_HEADER, contentSecurityPolicy);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set(CONTENT_SECURITY_POLICY_HEADER, contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    // Explicitly match / to fix a bug with basePath https://github.com/vercel/next.js/issues/47085
    "/",

    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
