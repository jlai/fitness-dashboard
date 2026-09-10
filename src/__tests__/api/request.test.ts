import {
  extractErrors,
  isAccountNotLinkedError,
  makeRequest,
} from "@/api/request";
import { logout } from "@/api/auth";

const SESSION_TOKEN_STORAGE_KEY = "auth:session-token";
const ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY = "auth:encrypted-health-token";

function fakeSessionToken() {
  const toBase64Url = (value: object) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  return `${toBase64Url({ alg: "HS256", typ: "session+jwt" })}.${toBase64Url({
    sub: "user-1",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  })}.sig`;
}

function mockFetch(fetchMock: jest.SpyInstance, healthResponse: Response) {
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/auth/health/access")) {
      return new Response(
        JSON.stringify({
          access_token: "test-token",
          expires_in: 3600,
          scope:
            "https://www.googleapis.com/auth/googlehealth.profile.readonly",
          encrypted_health_token: "encrypted-jwt",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return healthResponse.clone();
  });
}

const ACCOUNT_NOT_LINKED_BODY = {
  error: {
    code: 400,
    message: "The account is not linked to Google Health.",
    status: "FAILED_PRECONDITION",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        reason: "ACCOUNT_NOT_LINKED",
        domain: "health.googleapis.com",
        metadata: {
          redirect_uri: "https://evil.example/phishing",
        },
      },
    ],
  },
};

describe("isAccountNotLinkedError", () => {
  it("detects ACCOUNT_NOT_LINKED in Google error details", () => {
    expect(isAccountNotLinkedError(ACCOUNT_NOT_LINKED_BODY)).toBe(true);
  });

  it("returns false for other Google errors", () => {
    expect(
      isAccountNotLinkedError({
        error: {
          code: 400,
          message: "Invalid filter.",
          status: "INVALID_ARGUMENT",
          details: [{ reason: "INVALID_DATA_POINT_FILTER" }],
        },
      }),
    ).toBe(false);
  });

  it("returns false for missing or unrelated bodies", () => {
    expect(isAccountNotLinkedError(undefined)).toBe(false);
    expect(isAccountNotLinkedError({ errors: [] })).toBe(false);
  });
});

describe("extractErrors", () => {
  it("reads Google Health error messages", async () => {
    const errors = await extractErrors(
      new Response(JSON.stringify(ACCOUNT_NOT_LINKED_BODY), { status: 400 }),
    );

    expect(errors).toEqual([
      {
        errorType: "FAILED_PRECONDITION",
        fieldName: "unknown",
        message: "The account is not linked to Google Health.",
      },
    ]);
  });
});

describe("makeRequest", () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    logout();
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, fakeSessionToken());
    localStorage.setItem(ENCRYPTED_HEALTH_TOKEN_STORAGE_KEY, "encrypted-jwt");
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
    localStorage.clear();
  });

  it("dispatches an account-not-linked event without using the response redirect URI", async () => {
    mockFetch(
      fetchMock,
      new Response(JSON.stringify(ACCOUNT_NOT_LINKED_BODY), { status: 400 }),
    );
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    await expect(makeRequest("/v4/users/me")).rejects.toMatchObject({
      status: 400,
      errorText: "The account is not linked to Google Health.",
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "googlehealthaccountnotlinked" }),
    );
    expect(JSON.stringify(dispatchSpy.mock.calls)).not.toContain(
      "https://evil.example/phishing",
    );

    dispatchSpy.mockRestore();
  });

  it("does not dispatch the account-not-linked event for other 400 errors", async () => {
    mockFetch(
      fetchMock,
      new Response(
        JSON.stringify({
          error: {
            code: 400,
            message: "Invalid filter.",
            status: "INVALID_ARGUMENT",
          },
        }),
        { status: 400 },
      ),
    );
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    await expect(makeRequest("/v4/users/me")).rejects.toMatchObject({
      status: 400,
    });

    expect(dispatchSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "googlehealthaccountnotlinked" }),
    );

    dispatchSpy.mockRestore();
  });

  it("dispatches a rate-limit event on 429", async () => {
    mockFetch(fetchMock, new Response("too many requests", { status: 429 }));
    const dispatchSpy = jest.spyOn(window, "dispatchEvent");

    await expect(makeRequest("/v4/users/me")).rejects.toMatchObject({
      status: 429,
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: "fitbitratelimitexceeded" }),
    );

    dispatchSpy.mockRestore();
  });
});
