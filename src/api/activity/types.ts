import { HeartRateZone } from "../times-series";

// https://dev.fitbit.com/build/reference/web-api/activity/get-daily-activity-summary/
export interface GetDailyActivitySummaryResponse {
  goals?: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
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
  };
  heartRateZones: Array<{
    caloriesOut: number;
    max: number;
    min: number;
    minutes: number;
    name: string;
  }>;
  activities: Array<DailySummaryActivityLog>;
}

/** Activity log that appears in summary */
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

export interface ActivityLog {
  activeDuration: number;
  activityLevel: Array<{
    minutes: number;
    name: "sedentary" | "lightly" | "fairly" | "very";
  }>;
  activityName: string;
  activityTypeId: number;
  averageHeartRate?: number;
  calories: number;
  caloriesLink: string;
  duration: number;
  elevationGain: number;
  heartRateZones: Array<HeartRateZone>;
  lastModified: string;
  logId: number;
  logType: "auto_detected" | "manual" | "mobile_run" | "tracker";
  originalDuration: number;
  originalStartTime: string;
  startTime: string;
  steps?: number;
  tcxLink: string;

  distance?: number;
  distanceUnit: string;
}

export interface GetActivityLogResponse {
  activityLog: ActivityLog;
}

// https://dev.fitbit.com/build/reference/web-api/activity/get-activity-log-list/
export interface GetActivityLogListResponse {
  activities: Array<ActivityLog>;
  pagination: {
    afterDate: string;
    limit: number;
    next: string;
    previous: string;
    sort: "asc" | "desc";
  };
}

export interface ActivityType {
  id: number;
  name: string;
  hasSpeed?: boolean;
}

export interface GetActivityTypesResponse {
  categories: Array<{
    id: number;
    name: string;
    activities: Array<ActivityType>;
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

export interface GetActivityGoalsResponse {
  goals: {
    activeMinutes?: number; // daily only
    activeZoneMinutes: number;
    caloriesOut?: number; // daily only
    distance: number; // NOTE: always in user's server-side distance unit
    floors: number;
    steps: number;
  };
}

export type GoalResource = keyof GetActivityGoalsResponse["goals"];
