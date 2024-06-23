// https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-list/
export interface SleepLogListResponse {
  sleep: Array<SleepLog>;
  pagination: {
    afterDate: string;
    limit: number;
    next: string;
    previous: string;
    sort: "asc" | "desc";
  };
}

export interface SleepLogLevelData {
  dateTime: string;
  level: string;
  seconds: number;
}

export interface SleepLogLevelSummary {
  number: CountQueuingStrategy;
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
    summary: {
      deep?: SleepLogLevelSummary;
      light?: SleepLogLevelSummary;
      rem?: SleepLogLevelSummary;
      wake?: SleepLogLevelSummary;
    };
  };
  logId: string;
  logType: "auto_detected" | "manual";
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  startTime: string;
  timeInBed: number;
  type: "stages" | "classic";
}
