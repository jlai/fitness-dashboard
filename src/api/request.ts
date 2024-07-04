"use client";

import { atomEffect } from "jotai-effect";
import { toast } from "mui-sonner";

import { FITBIT_API_URL } from "@/config";

import { getFreshAccessToken } from "./auth";

const RATE_LIMIT_EXCEEDED_EVENT_TYPE = "fitbitratelimitexceeded";

/**
 * Make a request to the Fitbit API.
 */
export async function makeRequest(uri: string, options?: RequestInit) {
  const authToken = await getFreshAccessToken();

  const url = new URL(uri, FITBIT_API_URL);

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

    throw new Error(
      `server response (${response.status}): ${response.statusText}`
    );
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
