import { QueryClient } from "@tanstack/query-core";
import { Dayjs } from "dayjs";

import { VolumeQuantityUserProvidedUnit } from "@generated/orval/fetch/google-health-api/models";
import { healthUsersDataTypesDataPointsCreate } from "@generated/orval/fetch/google-health-api/users/users";

import { buildOneDayDatapointsQuery } from "../datapoints";
import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";

const FLUID_OZ_PER_ML = 0.033814;
const CUP_PER_ML = FLUID_OZ_PER_ML / 8;

export interface CreateWaterLogOptions {
  amount: number;
  unit: VolumeQuantityUserProvidedUnit;
  day: Dayjs;
}

function toMilliliters(amount: number, unit: VolumeQuantityUserProvidedUnit) {
  switch (unit) {
    case VolumeQuantityUserProvidedUnit.FLUID_OUNCE_US:
      return amount / FLUID_OZ_PER_ML;
    case VolumeQuantityUserProvidedUnit.CUP_US:
      return amount / CUP_PER_ML;
    default:
      return amount;
  }
}

function utcOffsetDuration(day: Dayjs) {
  return `${day.utcOffset() * 60}s`;
}

export function buildHydrationLogQuery(day: Dayjs) {
  return buildOneDayDatapointsQuery("hydration-log", day);
}

export function buildCreateWaterLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newWaterLog: CreateWaterLogOptions) => {
      const startTime = newWaterLog.day;
      const endTime = startTime.add(1, "second");
      const utcOffset = utcOffsetDuration(startTime);

      const response = await healthUsersDataTypesDataPointsCreate(
        "me",
        "hydration-log",
        {
          hydrationLog: {
            interval: {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              startUtcOffset: utcOffset,
              endUtcOffset: utcOffset,
            },
            amountConsumed: {
              milliliters: toMilliliters(newWaterLog.amount, newWaterLog.unit),
              userProvidedUnit: newWaterLog.unit,
            },
          },
        }
      );

      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["datapoints", "hydration-log", formatAsDate(variables.day)],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeseries", "water"],
      });
    },
  });
}
