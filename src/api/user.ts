import { queryOptions } from "@tanstack/react-query";

import { makeRequest } from "./request";
import { ONE_DAY_IN_MILLIS } from "./cache-settings";

// https://dev.fitbit.com/build/reference/web-api/user/get-profile/
interface GetUserProfileResponse {
  user: {
    fullName: string;
    avatar: string;
    avatar150: string;
    avatar650: string;

    distanceUnit: string;
    waterUnit: string;
    waterUnitName: string;
    weightUnit: string;
  };
}

export function buildUserProfileQuery() {
  return queryOptions({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/profile.json`);

      return ((await response.json()) as GetUserProfileResponse).user;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
