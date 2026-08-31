import { queryOptions } from "@tanstack/react-query";

import { ExerciseExerciseType } from "@generated/orval/fetch/google-health-api/models";

import {
  DISTANCE_EXERCISE_TYPES,
  formatExerciseTypeName,
} from "./helpers";
import { ExerciseType, GetActivityTypesResponse } from "./types";

export function getAllExerciseActivityTypes(): Array<ExerciseType> {
  return Object.values(ExerciseExerciseType)
    .filter((type) => type !== ExerciseExerciseType.EXERCISE_TYPE_UNSPECIFIED)
    .map((id) => ({
      id,
      name: formatExerciseTypeName(id),
      hasSpeed: DISTANCE_EXERCISE_TYPES.has(id),
    }));
}

export function buildActivityTypesQuery() {
  return queryOptions({
    queryKey: ["activity-types"],
    queryFn: async (): Promise<GetActivityTypesResponse> => ({
      categories: [
        {
          id: "all",
          name: "All",
          activities: getAllExerciseActivityTypes(),
        },
      ],
    }),
    staleTime: Infinity,
  });
}
