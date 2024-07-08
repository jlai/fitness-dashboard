import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";

import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import { makeRequest } from "../request";

interface CreateSleepLogOptions {
  startTime: Dayjs;
  endTime: Dayjs;
}

export function buildCreateSleepLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newSleepLog: CreateSleepLogOptions) => {
      const { startTime, endTime } = newSleepLog;

      const params = new URLSearchParams();
      params.set("date", formatAsDate(startTime));
      params.set("startTime", startTime.format("HH:mm"));
      params.set("duration", `${endTime.diff(startTime)}`);

      const response = await makeRequest(
        `/1.1/user/-/sleep.json?${params.toString()}`,
        {
          method: "POST",
        }
      );

      return response;
    },
    onSuccess: () => {
      queryClient.resetQueries({
        queryKey: ["sleep-log-list"],
      });
    },
  });
}
