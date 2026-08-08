const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

function getClientSecret() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
}

export async function POST(request: Request) {
  try {
    const incoming = await request.formData();
    const body = new URLSearchParams();

    for (const [key, value] of incoming.entries()) {
      if (typeof value === "string" && key !== "client_secret") {
        body.set(key, value);
      }
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
