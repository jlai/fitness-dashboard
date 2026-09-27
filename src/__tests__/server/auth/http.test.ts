import {
  badRequestResponse,
  forbiddenResponse,
  internalErrorResponse,
  jsonResponse,
  noContentResponse,
  unauthorizedResponse,
} from "@/server/auth/http";

const AUTH_CACHE_CONTROL = "no-cache, max-age=0, must-revalidate";

describe("auth HTTP helpers", () => {
  it("sets Cache-Control on JSON responses", () => {
    const response = jsonResponse({ ok: true });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(AUTH_CACHE_CONTROL);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets Cache-Control on no-content responses", () => {
    const response = noContentResponse();

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe(AUTH_CACHE_CONTROL);
  });

  it("sets Cache-Control on error responses", () => {
    const responses = [
      unauthorizedResponse("missing session token"),
      forbiddenResponse("cross-origin"),
      badRequestResponse("invalid json body"),
      internalErrorResponse("upstream failed"),
    ];

    for (const response of responses) {
      expect(response.headers.get("Cache-Control")).toBe(AUTH_CACHE_CONTROL);
    }
  });
});
