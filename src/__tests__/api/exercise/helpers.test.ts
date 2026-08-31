import { ExerciseExerciseType } from "@generated/orval/fetch/google-health-api/models";

import {
  formatExerciseTypeName,
  getExerciseCalories,
  getExerciseDistanceKilometers,
  getExerciseDurationMillis,
  getExerciseElevationMeters,
  parseDurationMillis,
} from "@/api/exercise/helpers";

describe("parseDurationMillis", () => {
  it("parses protobuf duration strings", () => {
    expect(parseDurationMillis("1800s")).toBe(1_800_000);
    expect(parseDurationMillis("1.5s")).toBe(1500);
    expect(parseDurationMillis("-2s")).toBe(-2000);
    expect(parseDurationMillis(undefined)).toBe(0);
  });
});

describe("exercise metric helpers", () => {
  it("converts summary metrics to display units", () => {
    const exercise = {
      exerciseType: ExerciseExerciseType.RUNNING,
      activeDuration: "1800s",
      metricsSummary: {
        caloriesKcal: 380,
        distanceMillimeters: 5_000_000,
        elevationGainMillimeters: 12_000,
      },
    };

    expect(getExerciseDurationMillis(exercise)).toBe(1_800_000);
    expect(getExerciseDistanceKilometers(exercise)).toBe(5);
    expect(getExerciseElevationMeters(exercise)).toBe(12);
    expect(getExerciseCalories(exercise)).toBe(380);
  });

  it("formats exercise type names", () => {
    expect(formatExerciseTypeName(ExerciseExerciseType.RUNNING)).toBe("Running");
    expect(formatExerciseTypeName(ExerciseExerciseType.HIIT)).toBe("HIIT");
    expect(formatExerciseTypeName(ExerciseExerciseType.TRAIL_RUN)).toBe(
      "Trail Run"
    );
  });
});
