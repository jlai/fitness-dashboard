export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(
  status: number,
  error: string,
  description: string,
) {
  return jsonResponse({ error, error_description: description }, status);
}

export function forbiddenResponse(message: string) {
  return errorResponse(403, "forbidden", message);
}

export function unauthorizedResponse(message: string) {
  return errorResponse(401, "unauthorized", message);
}

export function badRequestResponse(message: string) {
  return errorResponse(400, "invalid_request", message);
}

export function internalErrorResponse(message: string) {
  return errorResponse(500, "internal_error", message);
}

export function readBearerToken(request: Request) {
  const header = request.headers.get("Authorization");

  if (!header) {
    return undefined;
  }

  const match = /^Bearer\s+(\S+)/i.exec(header);

  return match?.[1];
}
