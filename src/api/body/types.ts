export interface WeightLog {
  bmi?: number;
  date: string;
  fat?: number;
  logId: number;
  source: string;
  time: string;
  weight: number;
}

// https://dev.fitbit.com/build/reference/web-api/body-timeseries/get-weight-timeseries-by-date-range/
export interface GetWeightTimeSeriesResponse {
  weight: Array<WeightLog>;
}

// https://dev.fitbit.com/build/reference/web-api/body/get-body-goals/
export interface GetBodyWeightGoalResponse {
  goal: {
    goalType: "GAIN" | "LOSE" | "MAINTAIN";
    startDate: string;
    startWeight: number;
    weight: number;
    weightThreshold: number;
  };
}
