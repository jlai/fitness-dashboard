import { queryOptions } from "@tanstack/react-query";

import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";
import { makeRequest } from "./request";

export interface Device {
  id: string;
  mac: string;
  type: "TRACKER" | "SCALE";
  batteryLevel: number;
  deviceVersion: string;
  lastSyncTime: string;
}

export function buildGetDevicesQuery() {
  return queryOptions({
    queryKey: ["devices"],
    queryFn: async () => {
      const response = await makeRequest(`/1/user/-/devices.json`);

      return (await response.json()) as Device[];
    },
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
