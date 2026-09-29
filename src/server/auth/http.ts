import type { z } from "zod";

import {
  InternalAuthError,
  RequestValidationError,
  FetchHeaderError,
  TokenEndpointError,
  TokenValidationError,
} from "./errors";

/** Prevent caching of auth responses to satisfy WSTG-SESS-04. */
const AUTH_CACHE_CONTROL = "no-cache, max-age=0, must-revalidate";

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": AUTH_CACHE_CONTROL,
    },
  });
}

export function noContentResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": AUTH_CACHE_CONTROL,
    },
  });
}

export function errorResponse(
  status: number,
  error: string,
  description: string,
) {
  return jsonResponse({ error, errorDescription: description }, status);
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

export async function readJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let json: unknown;

  try {
    json = await request.json();
  } catch {
    throw new RequestValidationError("invalid json body");
  }

  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    throw new RequestValidationError(
      parsed.error.issues[0]?.message ?? "invalid request body",
    );
  }

  return parsed.data;
}

/**
 * Map a thrown auth error to an HTTP response. Status codes live here, not on
 * the error types.
 */
export function getHTTPErrorResponse(
  error: unknown,
  fallbackInternalMessage = "internal error",
): Response {
  if (error instanceof FetchHeaderError) {
    return forbiddenResponse(error.message);
  }

  if (error instanceof RequestValidationError) {
    return badRequestResponse(error.message);
  }

  if (error instanceof TokenValidationError) {
    return unauthorizedResponse(error.message);
  }

  if (error instanceof TokenEndpointError) {
    return jsonResponse(
      {
        error: error.code,
        errorDescription: error.message,
      },
      400,
    );
  }

  if (error instanceof InternalAuthError) {
    return internalErrorResponse(error.message);
  }

  return internalErrorResponse(fallbackInternalMessage);
}
