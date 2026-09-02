import { POST } from "@/app/auth/google-oauth2-policy-requires-a-server/route";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ALLOWED_ORIGIN = "http://localhost:3000";
const CONFIGURED_CLIENT_ID = "FAKE_CLIENT_ID";

const ALLOWED_HEADERS = {
  Origin: ALLOWED_ORIGIN,
  "Sec-Fetch-Mode": "same-origin",
};

function authCodeBody(overrides: Record<string, string> = {}) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: "abc",
    client_id: CONFIGURED_CLIENT_ID,
    redirect_uri: ALLOWED_ORIGIN,
    ...overrides,
  }).toString();
}

function makeRequest({
  headers = {},
  body = authCodeBody(),
}: {
  headers?: HeadersInit;
  body?: string;
} = {}) {
  return new Request(
    "http://localhost:3000/auth/google-oauth2-policy-requires-a-server",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...headers,
      },
      body,
    },
  );
}

describe("google oauth token proxy", () => {
  const originalAllowedOrigin = process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN;
  const originalClientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  let fetchMock: jest.SpyInstance;

  async function expectForbidden(response: Response, message: string) {
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "forbidden",
      error_description: message,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = ALLOWED_ORIGIN;
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = CONFIGURED_CLIENT_ID;
    fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "tok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN = originalAllowedOrigin;
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = originalClientId;
    fetchMock.mockRestore();
  });

  it("forwards allowed same-origin authorization code requests to Google", async () => {
    const response = await POST(makeRequest({ headers: ALLOWED_HEADERS }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      GOOGLE_TOKEN_ENDPOINT,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("accepts an origin from a comma-separated allowlist", async () => {
    process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN =
      "https://dashboard.example.com, http://localhost:3000";

    const response = await POST(makeRequest({ headers: ALLOWED_HEADERS }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("forwards refresh token requests for the configured client", async () => {
    const response = await POST(
      makeRequest({
        headers: ALLOWED_HEADERS,
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: "rtok",
          client_id: CONFIGURED_CLIENT_ID,
        }).toString(),
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("rejects requests without Sec-Fetch-Mode: same-origin", async () => {
    const response = await POST(
      makeRequest({
        headers: {
          Origin: ALLOWED_ORIGIN,
          "Sec-Fetch-Mode": "cors",
        },
      }),
    );

    await expectForbidden(response, "request must be same-origin");
  });

  it("rejects requests from a disallowed origin", async () => {
    const response = await POST(
      makeRequest({
        headers: {
          Origin: "https://evil.example",
          "Sec-Fetch-Mode": "same-origin",
        },
      }),
    );

    await expectForbidden(response, "origin is not allowed");
  });

  it("rejects requests missing Origin", async () => {
    const response = await POST(
      makeRequest({
        headers: {
          "Sec-Fetch-Mode": "same-origin",
        },
      }),
    );

    await expectForbidden(response, "missing Origin header");
  });

  it("rejects a client_id that does not match the configured client", async () => {
    const response = await POST(
      makeRequest({
        headers: ALLOWED_HEADERS,
        body: authCodeBody({ client_id: "other-client" }),
      }),
    );

    await expectForbidden(response, "client_id is not allowed");
  });

  it("rejects grant types other than authorization_code and refresh_token", async () => {
    const response = await POST(
      makeRequest({
        headers: ALLOWED_HEADERS,
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: CONFIGURED_CLIENT_ID,
        }).toString(),
      }),
    );

    await expectForbidden(response, "unsupported grant_type");
  });

  it("rejects authorization code requests with extra params", async () => {
    const response = await POST(
      makeRequest({
        headers: ALLOWED_HEADERS,
        body: authCodeBody({ scope: "https://www.googleapis.com/auth/health" }),
      }),
    );

    await expectForbidden(response, "request contains disallowed parameters");
  });

  it("rejects authorization code requests with a disallowed redirect_uri", async () => {
    const response = await POST(
      makeRequest({
        headers: ALLOWED_HEADERS,
        body: authCodeBody({ redirect_uri: "https://evil.example" }),
      }),
    );

    await expectForbidden(response, "redirect_uri is not allowed");
  });
});
