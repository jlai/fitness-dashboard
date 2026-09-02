const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const AUTHORIZATION_CODE_PARAMS = new Set([
  "grant_type",
  "code",
  "client_id",
  "redirect_uri",
]);

const REFRESH_TOKEN_PARAMS = new Set([
  "grant_type",
  "refresh_token",
  "client_id",
]);

function getClientSecret() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

function getConfiguredClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? "";
}

function getAllowedOrigins() {
  return (process.env.GOOGLE_OAUTH_PROXY_ALLOWED_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function getProxyRequestError(request: Request) {
  if (request.headers.get("Sec-Fetch-Mode") !== "same-origin") {
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

function readTokenParams(incoming: FormData) {
  const body = new URLSearchParams();

  for (const [key, value] of incoming.entries()) {
    if (typeof value !== "string" || key === "client_secret") {
      continue;
    }

    body.set(key, value);
  }

  return body;
}

function hasOnlyAllowedParams(body: URLSearchParams, allowed: Set<string>) {
  return [...body.keys()].every((key) => allowed.has(key));
}

function getTokenRequestError(body: URLSearchParams) {
  const configuredClientId = getConfiguredClientId();
  const clientId = body.get("client_id");

  if (!configuredClientId || clientId !== configuredClientId) {
    return "client_id is not allowed";
  }

  const grantType = body.get("grant_type");

  if (grantType === "authorization_code") {
    if (!hasOnlyAllowedParams(body, AUTHORIZATION_CODE_PARAMS)) {
      return "request contains disallowed parameters";
    }

    if (!body.get("code")) {
      return "missing authorization code";
    }

    const redirectUri = body.get("redirect_uri");

    if (!redirectUri) {
      return "missing redirect_uri";
    }

    if (!getAllowedOrigins().includes(redirectUri)) {
      return "redirect_uri is not allowed";
    }

    return undefined;
  }

  if (grantType === "refresh_token") {
    if (!hasOnlyAllowedParams(body, REFRESH_TOKEN_PARAMS)) {
      return "request contains disallowed parameters";
    }

    if (!body.get("refresh_token")) {
      return "missing refresh_token";
    }

    return undefined;
  }

  return "unsupported grant_type";
}

function forbiddenResponse(message: string) {
  return new Response(
    JSON.stringify({ error: "forbidden", error_description: message }),
    {
      status: 403,
      headers: { "Content-Type": "application/json" },
    },
  );
}

export async function POST(request: Request) {
  const proxyError = getProxyRequestError(request);

  if (proxyError) {
    return forbiddenResponse(proxyError);
  }

  try {
    const body = readTokenParams(await request.formData());
    const tokenError = getTokenRequestError(body);

    if (tokenError) {
      return forbiddenResponse(tokenError);
    }

    const clientSecret = getClientSecret();

    if (clientSecret) {
      body.set("client_secret", clientSecret);
    }

    const googleResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const payload = await googleResponse.text();

    return new Response(payload, {
      status: googleResponse.status,
      headers: {
        "Content-Type":
          googleResponse.headers.get("Content-Type") ?? "application/json",
      },
    });
  } catch (reason) {
    const message =
      reason instanceof Error ? reason.message : "token request failed";

    return new Response(message, { status: 500 });
  }
}
