import {
  InternalAuthError,
  RequestValidationError,
  FetchHeaderError,
  TokenEndpointError,
  TokenValidationError,
} from "@/server/auth/errors";
import {
  acceptedResponse,
  badRequestResponse,
  forbiddenResponse,
  getHTTPErrorResponse,
  internalErrorResponse,
  jsonResponse,
  noContentResponse,
  readJsonBody,
  unauthorizedResponse,
} from "@/server/auth/http";
import { createSessionBodySchema } from "@/server/auth/request-bodies";

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

  it("sets Cache-Control on accepted responses", () => {
    const response = acceptedResponse();

    expect(response.status).toBe(202);
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

  it("maps typed auth errors to HTTP responses without using status on the error", async () => {
    await expect(
      getHTTPErrorResponse(
        new TokenValidationError("encrypted token has expired"),
      ).json(),
    ).resolves.toEqual({
      error: "unauthorized",
      errorDescription: "invalid token",
    });
    expect(
      getHTTPErrorResponse(new TokenValidationError("invalid encrypted token"))
        .status,
    ).toBe(401);
    expect(
      getHTTPErrorResponse(
        new TokenValidationError("session does not match encrypted token"),
      ).status,
    ).toBe(401);
    expect(getHTTPErrorResponse(new FetchHeaderError()).status).toBe(403);
    expect(
      getHTTPErrorResponse(new RequestValidationError("invalid json body"))
        .status,
    ).toBe(400);
    await expect(
      getHTTPErrorResponse(
        new TokenEndpointError(
          "token_refresh_failed",
          "refresh token exchange failed",
        ),
      ).json(),
    ).resolves.toEqual({
      error: "token_refresh_failed",
      errorDescription: "refresh token exchange failed",
    });
    expect(
      getHTTPErrorResponse(new InternalAuthError("error revoking drive token"))
        .status,
    ).toBe(500);
    expect(getHTTPErrorResponse(new Error("boom"), "fallback").status).toBe(
      500,
    );
  });
});

describe("readJsonBody", () => {
  it("parses and returns a body that matches the schema", async () => {
    const request = new Request("http://localhost:3000/auth/session", {
      method: "POST",
      body: JSON.stringify({ idToken: "google-id-token" }),
    });

    await expect(
      readJsonBody(request, createSessionBodySchema),
    ).resolves.toEqual({ idToken: "google-id-token" });
  });

  it("rejects invalid JSON", async () => {
    const request = new Request("http://localhost:3000/auth/session", {
      method: "POST",
      body: "{",
    });

    await expect(
      readJsonBody(request, createSessionBodySchema),
    ).rejects.toEqual(new RequestValidationError("invalid json body"));
  });

  it("rejects a body that does not match the schema", async () => {
    const request = new Request("http://localhost:3000/auth/session", {
      method: "POST",
      body: JSON.stringify({}),
    });

    await expect(
      readJsonBody(request, createSessionBodySchema),
    ).rejects.toEqual(new RequestValidationError("missing idToken"));
  });
});
