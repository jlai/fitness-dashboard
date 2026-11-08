import { queryOptions } from "@tanstack/react-query";

import {
  type PairedDevice,
  PairedDeviceDeviceType,
} from "@generated/orval/fetch/google-health-api/models";
import { healthUsersPairedDevicesList } from "@generated/orval/fetch/google-health-api/users/users";

import { ONE_MINUTE_IN_MILLIS } from "./cache-settings";

export type { PairedDevice };
export { PairedDeviceDeviceType };

const PAIRED_DEVICES_PAGE_SIZE = 100;

export function getPairedDeviceId(device: PairedDevice) {
  const name = device.name ?? "";
  const segments = name.split("/");
  return segments[segments.length - 1] || name;
}

export async function listPairedDevices() {
  const pairedDevices: PairedDevice[] = [];
  let pageToken: string | undefined;

  do {
    const response = await healthUsersPairedDevicesList("me", {
      pageSize: PAIRED_DEVICES_PAGE_SIZE,
      pageToken,
    });

    pairedDevices.push(...(response.data.pairedDevices ?? []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return pairedDevices;
}

export function buildGetDevicesQuery() {
  return queryOptions({
    queryKey: ["paired-devices"],
    queryFn: listPairedDevices,
    staleTime: ONE_MINUTE_IN_MILLIS,
  });
}
