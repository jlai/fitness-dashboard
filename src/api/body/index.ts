import dayjs, { Dayjs } from "dayjs";
import { QueryClient, queryOptions } from "@tanstack/react-query";

import { DataSourceRecordingMethod } from "@generated/orval/fetch/google-health-api/models";
import {
  healthUsersDataTypesDataPointsBatchDelete,
  healthUsersDataTypesDataPointsCreate,
} from "@generated/orval/fetch/google-health-api/users/users";

import { buildDatapointsQuery } from "../datapoints";
import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";
import type { WeightUnitSystem } from "../user";

import { gramsFromLocalizedWeight, toWeightLogs } from "./helpers";

export * from "./helpers";
export * from "./types";

interface CreateWeightLogOptions {
  weight: number;
  weightUnitSystem: WeightUnitSystem;
  day: Dayjs;
  percentFat?: number;
}

function utcOffsetDuration(day: Dayjs) {
  return `${day.utcOffset() * 60}s`;
}

function sampleTimeForLog(day: Dayjs) {
  const today = dayjs();
  return day.isSame(today, "day") ? today : day.startOf("day");
}

function observationSampleTime(day: Dayjs) {
  return {
    physicalTime: day.toISOString(),
    utcOffset: utcOffsetDuration(day),
  };
}

async function invalidateWeightQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["weight-logs"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["datapoints", "weight"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["datapoints", "body-fat"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["timeseries", "weight"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["timeseries", "fat"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["timeseries", "bmi"],
    }),
  ]);
}

export function buildCreateWeightLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newWeightLog: CreateWeightLogOptions) => {
      const sampleTime = sampleTimeForLog(newWeightLog.day);
      const sample = observationSampleTime(sampleTime);

      await healthUsersDataTypesDataPointsCreate("me", "weight", {
        dataSource: {
          recordingMethod: DataSourceRecordingMethod.MANUAL,
        },
        weight: {
          sampleTime: sample,
          weightGrams: gramsFromLocalizedWeight(
            Number(newWeightLog.weight),
            newWeightLog.weightUnitSystem,
          ),
        },
      });

      if (newWeightLog.percentFat) {
        await healthUsersDataTypesDataPointsCreate("me", "body-fat", {
          dataSource: {
            recordingMethod: DataSourceRecordingMethod.MANUAL,
          },
          bodyFat: {
            sampleTime: sample,
            percentage: Number(newWeightLog.percentFat),
          },
        });
      }
    },
    onSuccess: () => invalidateWeightQueries(queryClient),
  });
}

export function buildDeleteWeightLogMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (weightLogName: string) => {
      await healthUsersDataTypesDataPointsBatchDelete("me", "weight", {
        names: [weightLogName],
      });
    },
    onSuccess: () => invalidateWeightQueries(queryClient),
  });
}

export function buildGetWeightLogsQuery(startDay: Dayjs, endDay: Dayjs) {
  const rangeStart = startDay.startOf("day");
  const rangeEndExclusive = endDay.startOf("day").add(1, "day");

  return queryOptions({
    queryKey: ["weight-logs", formatAsDate(startDay), formatAsDate(endDay)],
    queryFn: async ({ client }) => {
      const [
        { dataPoints: weights },
        { dataPoints: fats },
        { dataPoints: heights },
      ] = await Promise.all([
        client.fetchQuery(
          buildDatapointsQuery("weight", rangeStart, rangeEndExclusive, {
            timeField: "civil",
          }),
        ),
        client.fetchQuery(
          buildDatapointsQuery("body-fat", rangeStart, rangeEndExclusive, {
            timeField: "civil",
          }),
        ),
        client.fetchQuery(
          buildDatapointsQuery(
            "height",
            rangeStart.subtract(10, "year"),
            rangeEndExclusive,
            { timeField: "civil" },
          ),
        ),
      ]);

      return toWeightLogs(weights, fats, heights);
    },
  });
}
