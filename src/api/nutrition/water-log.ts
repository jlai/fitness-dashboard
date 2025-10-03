import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";

import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import { makeRequest } from "../request";

const AMOUNT_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export interface CreateWaterLogOptions {
  amount: number;
  unit: "ml" | "fl oz" | "cup";
  day: Dayjs;
}

export function buildCreateWaterLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newWaterLog: CreateWaterLogOptions) => {
      const params = new URLSearchParams();
      params.set("amount", AMOUNT_FORMAT.format(newWaterLog.amount));
      params.set("unit", `${newWaterLog.unit}`);
      params.set("date", formatAsDate(newWaterLog.day));

      const response = await makeRequest(
        `/1/user/-/foods/log/water.json?${params.toString()}`,
        {
          method: "POST",
          ignore502: true,
        }
      );

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["food-log", formatAsDate(variables.day)],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeseries", "water"],
      });
    },
  });
}
