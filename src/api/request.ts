"use client";

import { atomEffect } from "jotai-effect";
import { toast } from "mui-sonner";

import { FITBIT_API_URL } from "@/config";

import { getFreshAccessToken } from "./auth";

const RATE_LIMIT_EXCEEDED_EVENT_TYPE = "fitbitratelimitexceeded";

export interface ErrorResponseBody {
  errors: Array<{
    errorType: string;
    fieldName: string;
    message: string;
  }>;
}

export interface ServerError extends Error {
  errors?: ErrorResponseBody["errors"];
  errorText?: string;
}

/**
 * Make a request to the Fitbit API.
 */
export async function makeRequest(uri: string, options?: RequestInit) {
  const authToken = await getFreshAccessToken();

  const url = new URL(uri, FITBIT_API_URL);

  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept-Language": "metric",
      ...options?.headers,
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      window.dispatchEvent(new CustomEvent(RATE_LIMIT_EXCEEDED_EVENT_TYPE));
    }

    const errors = await extractErrors(response);
    const errorText = errors
      ? errors.map((error) => error.message).join(" ")
      : undefined;

    const err = new Error(
      `server response (${response.status}): ${
        errorText || response.statusText
      }`
    ) as ServerError;

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

/**
 * Extract error messages from response body.
 * See https://dev.fitbit.com/build/reference/web-api/troubleshooting-guide/error-handling/
 */
export async function extractErrors(response: Response) {
  try {
    const responseObj = (await response.json()) as ErrorResponseBody;

    if (Array.isArray(responseObj.errors)) {
      return responseObj.errors;
    }
  } catch (err) {
    return undefined;
  }

  return undefined;
}
