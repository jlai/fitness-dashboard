import { QueryClient, queryOptions } from "@tanstack/react-query";

import { NumberFormats } from "@/utils/number-formats";

import { makeRequest } from "../request";
import { ONE_DAY_IN_MILLIS } from "../cache-settings";
import mutationOptions from "../mutation-options";

import { GetActivityGoalsResponse, GoalResource } from "./types";

export function buildActivityGoalsQuery(period: "daily" | "weekly") {
  return queryOptions({
    queryKey: ["activity-goals", period],
    queryFn: async () => {
      const response = await makeRequest(
        `/1/user/-/activities/goals/${period}.json`
      );

      return ((await response.json()) as GetActivityGoalsResponse).goals;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export interface UpdateActivityGoalOptions {
  resource: GoalResource;
  period: "daily" | "weekly";
  goal: number;
}

export function buildUpdateActivityGoalMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async ({
      resource,
      period,
      goal,
    }: UpdateActivityGoalOptions) => {
      const params = new URLSearchParams();
      params.set("type", resource);
      params.set("value", NumberFormats.FRACTION_DIGITS_0.format(goal));

      const response = await makeRequest(
        `/1/user/-/activities/goals/${period}.json?${params.toString()}`,
        {
          method: "POST",
        }
      );

      return ((await response.json()) as GetActivityGoalsResponse).goals;
    },
    onSuccess(updatedGoals, variables) {
      const { period } = variables;

      queryClient.setQueryData(["activity-goals", period], updatedGoals);
    },
  });
}
