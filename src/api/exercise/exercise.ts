import {
  infiniteQueryOptions,
  QueryClient,
  queryOptions,
} from "@tanstack/react-query";
import { Dayjs } from "dayjs";

import {
  DataSourceRecordingMethod,
  ExerciseExerciseType,
} from "@generated/orval/fetch/google-health-api/models";
import {
  healthUsersDataTypesDataPointsBatchDelete,
  healthUsersDataTypesDataPointsCreate,
  healthUsersDataTypesDataPointsExportExerciseTcx,
} from "@generated/orval/fetch/google-health-api/users/users";

import { ONE_DAY_IN_MILLIS } from "../cache-settings";
import {
  buildOneDayDatapointsQuery,
  getDataPoint,
  listDataPointsPage,
} from "../datapoints";
import { formatAsDate } from "../datetime";
import mutationOptions from "../mutation-options";

import type { ExerciseDataPoint } from "./helpers";
import { ExerciseListResponse } from "./types";

const MAX_EXERCISE_PAGE_SIZE = 25;

const MM_PER_MILE = 1_609_344;
const MM_PER_KILOMETER = 1_000_000;
const MM_PER_METER = 1000;
const MM_PER_YARD = 914.4;

function utcOffsetDuration(day: Dayjs) {
  return `${day.utcOffset() * 60}s`;
}

function exercisesStartingBeforeFilter(before: Dayjs) {
  return `exercise.interval.civil_start_time < "${formatAsDate(
    before.add(1, "day"),
  )}"`;
}

export function buildGetExerciseQuery(id: string) {
  return queryOptions({
    queryKey: ["exercise", id],
    queryFn: () => getDataPoint("exercise", id),
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildExerciseTcxQuery(id: string) {
  return queryOptions({
    queryKey: ["exercise-tcx", id],
    queryFn: async () => {
      const response = await healthUsersDataTypesDataPointsExportExerciseTcx(
        "me",
        "exercise",
        id,
        { partialData: true },
      );
      return decodeTcxData(response.data.tcxData);
    },
    staleTime: Infinity,
  });
}

function decodeTcxData(tcxData?: string) {
  if (!tcxData) {
    return "";
  }

  const trimmed = tcxData.trim();
  if (trimmed.startsWith("<")) {
    return tcxData;
  }

  try {
    return atob(tcxData);
  } catch {
    return tcxData;
  }
}

export function buildGetExerciseByDateQuery(day: Dayjs) {
  return queryOptions({
    ...buildOneDayDatapointsQuery("exercise", day),
    select: ({ dataPoints }) => dataPoints,
  });
}

export type CreateExerciseDistanceUnit =
  "mile" | "steps" | "yards" | "meter" | "kilometer";

export interface CreateExerciseOptions {
  exerciseType: ExerciseExerciseType;
  startTime: Dayjs;
  durationMinutes: number;
  distance?: number;
  distanceUnit?: CreateExerciseDistanceUnit;
  manualCalories?: number;
}

function toMillimeters(distance: number, unit: CreateExerciseDistanceUnit) {
  switch (unit) {
    case "mile":
      return distance * MM_PER_MILE;
    case "kilometer":
      return distance * MM_PER_KILOMETER;
    case "meter":
      return distance * MM_PER_METER;
    case "yards":
      return distance * MM_PER_YARD;
    case "steps":
      return undefined;
  }
}

export function buildCreateExerciseMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (newExercise: CreateExerciseOptions) => {
      const {
        exerciseType,
        startTime,
        durationMinutes,
        manualCalories,
        distance,
        distanceUnit,
      } = newExercise;

      const endTime = startTime.add(durationMinutes, "minute");
      const startUtcOffset = utcOffsetDuration(startTime);
      const endUtcOffset = utcOffsetDuration(endTime);
      const distanceMillimeters =
        distance != null && distanceUnit
          ? toMillimeters(distance, distanceUnit)
          : undefined;

      const response = await healthUsersDataTypesDataPointsCreate(
        "me",
        "exercise",
        {
          dataSource: {
            recordingMethod: DataSourceRecordingMethod.MANUAL,
          },
          exercise: {
            interval: {
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              startUtcOffset,
              endUtcOffset,
            },
            exerciseType,
            activeDuration: `${durationMinutes * 60}s`,
            metricsSummary: {
              caloriesKcal: manualCalories ?? 0,
              distanceMillimeters,
              steps:
                distanceUnit === "steps" && distance != null
                  ? `${Math.round(distance)}`
                  : undefined,
            },
          },
        },
      );

      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.resetQueries({
        queryKey: ["exercise-list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["datapoints", "exercise", formatAsDate(variables.startTime)],
      });
      queryClient.invalidateQueries({
        queryKey: ["datapoints", "daily-rollup"],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeseries"],
      });
    },
  });
}

export function buildGetExerciseListInfiniteQuery(
  initialDay: Dayjs,
  pageSize: number,
) {
  return infiniteQueryOptions({
    queryKey: ["exercise-list", formatAsDate(initialDay), pageSize],
    queryFn: async ({ pageParam }) => {
      const dataPoints: Array<ExerciseDataPoint> = [];
      let pageToken: string | undefined = pageParam || undefined;

      while (dataPoints.length < pageSize) {
        const page = await listDataPointsPage(
          "exercise",
          exercisesStartingBeforeFilter(initialDay),
          pageToken,
          Math.min(pageSize - dataPoints.length, MAX_EXERCISE_PAGE_SIZE),
        );

        dataPoints.push(...page.dataPoints);
        pageToken = page.nextPageToken;

        if (!pageToken || page.dataPoints.length === 0) {
          break;
        }
      }

      const response: ExerciseListResponse = {
        activities: dataPoints,
        pagination: {
          afterDate: "",
          limit: pageSize,
          next: pageToken ?? "",
          previous: "",
          sort: "desc",
        },
      };

      return response;
    },
    getNextPageParam: (lastPage) => lastPage.pagination.next || null,
    initialPageParam: "",
  });
}

export function buildDeleteExerciseMutation(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: async (dataPointName: string) => {
      await healthUsersDataTypesDataPointsBatchDelete("me", "exercise", {
        names: [dataPointName],
      });
    },
    onSuccess: () => {
      queryClient.resetQueries({
        queryKey: ["exercise-list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["datapoints", "exercise"],
      });
      queryClient.invalidateQueries({
        queryKey: ["datapoints", "daily-rollup"],
      });
      queryClient.invalidateQueries({
        queryKey: ["timeseries"],
      });
    },
  });
}
