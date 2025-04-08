// https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-list/
export interface GetSleepLogListResponse {
  sleep?: Array<SleepLog>; // could be missing if no sleep logs
  pagination: {
    afterDate: string;
    limit: number;
    next: string;
    previous: string;
    sort: "asc" | "desc";
  };
}

export interface GetSleepLogTimeSeriesResponse {
  sleep: Array<SleepLog>;
}

export interface SleepLogLevelData {
  dateTime: string;
  level: string;
  seconds: number;
}

export interface SleepLogLevelSummary {
  count: number;
  minutes: number;
  thirtyDayAvgMinutes: number;
}

export interface SleepLog {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  isMainSleep: boolean;
  levels?: {
    data: Array<SleepLogLevelData>;
    shortData: Array<SleepLogLevelData>;
    summary: {
      // Sleep stages
      deep?: SleepLogLevelSummary;
      light?: SleepLogLevelSummary;
      rem?: SleepLogLevelSummary;
      wake?: SleepLogLevelSummary;

      // Classic sleep
      awake?: SleepLogLevelSummary;
      asleep?: SleepLogLevelSummary;
      restless?: SleepLogLevelSummary;
    };
  };
  logId: number;
  logType: "auto_detected" | "manual";
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  startTime: string;
  timeInBed: number;
  type: "stages" | "classic";
}

// https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-goals/
export interface GetSleepGoalResponse {
  goal: {
    minDuration: number;
    updatedOn: string;
  };
}
