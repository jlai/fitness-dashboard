import { queryOptions } from "@tanstack/react-query";

import { ONE_DAY_IN_MILLIS } from "../cache-settings";
import { getDataPoint } from "../datapoints";

import { mapFoodDataPoints } from "./helpers";

export function buildGetFoodQuery(foodId: string) {
  return queryOptions({
    queryKey: ["food", foodId],
    queryFn: async () => {
      const dataPoint = await getDataPoint("food", foodId);
      const [food] = await mapFoodDataPoints([dataPoint]);
      return food;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
