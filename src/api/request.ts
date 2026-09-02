"use client";

import { atomEffect } from "jotai-effect";
import { toast } from "mui-sonner";
import JSONWithBigInt from "json-bigint-native";

import { getFreshAccessToken } from "./auth";
import { GOOGLE_HEALTH_API_URL, withBasePath } from "@/config";

const RATE_LIMIT_EXCEEDED_EVENT_TYPE = "fitbitratelimitexceeded";
const ACCOUNT_NOT_LINKED_EVENT_TYPE = "googlehealthaccountnotlinked";
const ACCOUNT_NOT_LINKED_REASON = "ACCOUNT_NOT_LINKED";
export const ACCOUNT_NOT_LINKED_PAGE_PATH = "/about/not-signed-up";

export interface ErrorResponseBody {
  errors: Array<{
    errorType: string;
    fieldName: string;
    message: string;
  }>;
}

export interface ServerError extends Error {
  status: Response["status"];
  errors?: ErrorResponseBody["errors"];
  errorText?: string;
}

export interface MakeRequestOptions {
  // Fitbit API sometimes throws spurious 502 errors on delete, e.g.
  // https://community.fitbit.com/t5/Web-API-Development/deletion-of-water-records-502-error/td-p/5786102
  ignore502?: boolean;
}

/**
 * Make a request to the Fitbit API.
 */
export async function makeRequest(
  uri: string,
  options?: RequestInit & MakeRequestOptions,
) {
  const authToken = await getFreshAccessToken();

  const url = new URL(uri, GOOGLE_HEALTH_API_URL);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      window.dispatchEvent(new CustomEvent(RATE_LIMIT_EXCEEDED_EVENT_TYPE));
    }

    const { errors, json } = await readErrorResponse(response);

    if (isAccountNotLinkedError(json)) {
      window.dispatchEvent(new CustomEvent(ACCOUNT_NOT_LINKED_EVENT_TYPE));
    }

    const errorText = errors
      ? errors.map((error: any) => error.message).join(" ")
      : undefined;

    const err = new Error(
      `server response (${response.status}): ${
        errorText || response.statusText
      }`,
    ) as ServerError;

    err.status = response.status;
    err.errors = errors;
    err.errorText = errorText;

    throw err;
  }

  return response;
}

/** Watch for localStorage changes from other windows. */
export const warnOnRateLimitExceededEffect = atomEffect((get, set) => {
  let lastWarning = 0;

  // Events fired from dispatchEvent
  const listener = () => {
    if (Date.now() - lastWarning > 60 * 1000) {
      toast.error("Fitbit API rate limit exceeded");
      lastWarning = Date.now();
    }
  };

  window.addEventListener(RATE_LIMIT_EXCEEDED_EVENT_TYPE, listener);

  return () => {
    window.removeEventListener(RATE_LIMIT_EXCEEDED_EVENT_TYPE, listener);
  };
});

export function redirectToAccountNotLinkedPage() {
  const destination = withBasePath(ACCOUNT_NOT_LINKED_PAGE_PATH);
  if (window.location.pathname !== destination) {
    window.location.assign(destination);
  }
}

/** Redirect to account-not-linked instructions when the Google account is not linked. */
export const redirectOnAccountNotLinkedEffect = atomEffect(() => {
  window.addEventListener(
    ACCOUNT_NOT_LINKED_EVENT_TYPE,
    redirectToAccountNotLinkedPage,
  );

  return () => {
    window.removeEventListener(
      ACCOUNT_NOT_LINKED_EVENT_TYPE,
      redirectToAccountNotLinkedPage,
    );
  };
});

interface GoogleRpcErrorInfo {
  reason?: string;
}

interface GoogleErrorBody {
  error?: {
    message?: string;
    status?: string;
    details?: GoogleRpcErrorInfo[];
  };
}

function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function isAccountNotLinkedError(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }

  const details = (body as GoogleErrorBody).error?.details;
  return (
    Array.isArray(details) &&
    details.some((detail) => detail?.reason === ACCOUNT_NOT_LINKED_REASON)
  );
}

function errorsFromParsedBody(
  text: string,
  json: unknown,
): ErrorResponseBody["errors"] {
  if (json && typeof json === "object") {
    const fitbitErrors = (json as ErrorResponseBody).errors;
    if (Array.isArray(fitbitErrors)) {
      return fitbitErrors;
    }

    const googleError = (json as GoogleErrorBody).error;
    if (googleError?.message) {
      return [
        {
          errorType: googleError.status ?? "unknown",
          fieldName: "unknown",
          message: googleError.message,
        },
      ];
    }
  }

  return [{ message: text, errorType: "unknown", fieldName: "unknown" }];
}

async function readErrorResponse(response: Response) {
  try {
    const text = await response.text();
    const json = parseJsonBody(text);
    return { json, errors: errorsFromParsedBody(text, json) };
  } catch {
    return {
      json: undefined,
      errors: [
        {
          message: "Failed to read error response",
          errorType: "unknown",
          fieldName: "unknown",
        },
      ],
    };
  }
}

/**
 * Extract error messages from response body.
 * See https://dev.fitbit.com/build/reference/web-api/troubleshooting-guide/error-handling/
 */
export async function extractErrors(response: Response) {
  const { errors } = await readErrorResponse(response);
  return errors;
}

/** Get JSON body from a Response with BigInt support */
export async function getJSON<T = object>(response: Response) {
  const body = await response.text();
  return JSONWithBigInt.parse(body) as T;
}
