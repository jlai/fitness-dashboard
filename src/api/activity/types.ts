// https://dev.fitbit.com/build/reference/web-api/activity/get-daily-activity-summary/
export interface DailyActivitySummaryResponse {
  goals: {
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
}

export interface ActivityLog {
  activeDuration: number;
  activityLevel: Array<{
    minutes: number;
    name: "sedentary" | "lightly" | "fairly" | "very";
  }>;
  activityName: string;
  activityTypeId: number;
  calories: number;
  caloriesLink: string;
  duration: number;
  elevationGain: number;
  lastModified: string;
  logId: string;
  logType: "auto_detected" | "manual" | "mobile_run" | "tracker";
  originalDuration: number;
  originalStartTime: string;
  startTime: string;
  steps: number;
  tcxLink: string;

  distance?: number;
  distanceUnit: string;
}

// https://dev.fitbit.com/build/reference/web-api/activity/get-activity-log-list/
export interface ActivityLogListResponse {
  activities: Array<ActivityLog>;
  pagination: {
    afterDate: string;
    limit: number;
    next: string;
    previous: string;
    sort: "asc" | "desc";
  };
}
