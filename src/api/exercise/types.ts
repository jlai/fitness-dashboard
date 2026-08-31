import type { ExerciseExerciseType } from "@generated/orval/fetch/google-health-api/models";

import type { ExerciseDataPoint } from "./helpers";

// https://dev.fitbit.com/build/reference/web-api/activity/get-daily-activity-summary/
export interface GetDailyActivitySummaryResponse {
  goals?: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number; // millimeters
    floors: number;
    steps: number;
  };
  summary: {
    caloriesBMR: number;
    caloriesOut: number;
    steps: number;
    floors: number;
    distances: Array<{
      activity: string;
      distance: number;
    }>;
    lightlyActiveMinutes: number;
    fairlyActiveMinutes: number;
    veryActiveMinutes: number;

    // seems to always be empty
    heartRateZones?: Array<{
      caloriesOut: number;
      max: number;
      min: number;
      minutes: number;
      name: string;
    }>;
  };
  activities: Array<DailySummaryActivityLog>;
}

/** Activity log that appears in the daily activity summary. */
export interface DailySummaryActivityLog {
  activityId: number;
  activityParentId: number;
  activityParentName: string;
  calories: number;
  description: string;
  distance: number;
  duration: number;
  hasActiveZoneMinutes: boolean;
  hasStartTime: boolean;
  isFavorite: boolean;
  lastModified: string;
  logId: number;
  name: string;
  startDate: string;
  startTime: string;
  steps: number;
}

export interface ExerciseListResponse {
  activities?: Array<ExerciseDataPoint>;
  pagination: {
    afterDate: string;
    limit: number;
    next: string;
    previous: string;
    sort: "asc" | "desc";
  };
}

export interface ExerciseType {
  id: ExerciseExerciseType;
  name: string;
  hasSpeed?: boolean;
}

export interface GetActivityTypesResponse {
  categories: Array<{
    id: string;
    name: string;
    activities: Array<ExerciseType>;
  }>;
}

export interface GetLifetimeStatsResponse {
  lifetime: {
    tracker: {
      distance: number;
      floors: number;
      steps: number;
    };
  };
}
