import type { SleepDataPoint } from "./helpers";

export type { SleepDataPoint };

export interface SleepListResponse {
  sleep?: Array<SleepDataPoint>;
  pagination: {
    afterDate: string;
    limit: number;
    next: string;
    previous: string;
    sort: "asc" | "desc";
  };
}
