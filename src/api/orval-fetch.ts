import { GOOGLE_HEALTH_API_URL } from "@/config";

import { getFreshAccessToken } from "./auth";
import { getJSON, makeRequest } from "./request";

type CustomFetchOptions = RequestInit & {
  ignore502?: boolean;
};

/**
 * Orval mutator for Google Health API requests.
 * Attaches OAuth and returns Orval's `{ data, status, headers }` envelope.
 */
export const customFetch = async <T>(
  url: string,
  options?: CustomFetchOptions
): Promise<T> => {
  // Ensure relative Orval paths resolve against the Health API origin.
  const absoluteUrl = new URL(url, GOOGLE_HEALTH_API_URL).toString();

  // Touch auth early so expired tokens refresh before the request.
  await getFreshAccessToken();

  const response = await makeRequest(absoluteUrl, options);
  const data = await getJSON(response);

  return { data, status: response.status, headers: response.headers } as T;
};
