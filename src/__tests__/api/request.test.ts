import {
  extractErrors,
  isAccountNotLinkedError,
  makeRequest,
} from "@/api/request";

const TOKEN_STORAGE_KEY = "auth:google-token";

const STORED_TOKEN = {
  accessToken: "test-token",
  refreshToken: "stored-refresh-token",
  expiresAt: Date.now() + 60 * 60 * 1000,
  scope: "https://www.googleapis.com/auth/googlehealth.profile.readonly",
};

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
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(STORED_TOKEN));
    fetchMock = jest.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchMock.mockRestore();
    localStorage.clear();
  });

  it("dispatches an account-not-linked event without using the response redirect URI", async () => {
    fetchMock.mockResolvedValue(
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
    fetchMock.mockResolvedValue(
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
    fetchMock.mockResolvedValue(
      new Response("too many requests", { status: 429 }),
    );
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
