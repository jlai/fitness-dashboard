import type { ExerciseExerciseType } from "@generated/orval/fetch/google-health-api/models";

import type { ExerciseDataPoint } from "./helpers";

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
