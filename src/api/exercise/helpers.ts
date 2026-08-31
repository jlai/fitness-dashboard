import dayjs from "dayjs";

import type { Exercise } from "@generated/orval/fetch/google-health-api/models";
import { ExerciseExerciseType } from "@generated/orval/fetch/google-health-api/models";

import type { DataPointFor } from "../datapoints";
import { getDataPointValue } from "../datapoints";

export type ExerciseDataPoint = DataPointFor<"exercise">;

const EXERCISE_TYPE_ACRONYMS = new Set(["HIIT", "TRX"]);

/** Exercise types where distance is a typical metric. */
export const DISTANCE_EXERCISE_TYPES = new Set<ExerciseExerciseType>([
  ExerciseExerciseType.BACKPACKING,
  ExerciseExerciseType.BIKING,
  ExerciseExerciseType.CANOEING,
  ExerciseExerciseType.CROSS_COUNTRY_SKI,
  ExerciseExerciseType.ELECTRIC_BIKE,
  ExerciseExerciseType.ELECTRIC_SCOOTER,
  ExerciseExerciseType.ELLIPTICAL,
  ExerciseExerciseType.HAND_CYCLING,
  ExerciseExerciseType.HIKING,
  ExerciseExerciseType.ICE_SKATING,
  ExerciseExerciseType.INCLINE_RUN,
  ExerciseExerciseType.INCLINE_WALK,
  ExerciseExerciseType.KAYAKING,
  ExerciseExerciseType.MOUNTAIN_BIKE,
  ExerciseExerciseType.NORDIC_WALKING,
  ExerciseExerciseType.OUTDOOR_BIKE,
  ExerciseExerciseType.PADDLEBOARDING,
  ExerciseExerciseType.POWER_WALKING,
  ExerciseExerciseType.ROLLERBLADING,
  ExerciseExerciseType.ROLLER_SKATING,
  ExerciseExerciseType.ROWING,
  ExerciseExerciseType.ROWING_MACHINE,
  ExerciseExerciseType.RUCKING,
  ExerciseExerciseType.RUNNING,
  ExerciseExerciseType.SCOOTERING,
  ExerciseExerciseType.SKATING,
  ExerciseExerciseType.SKIING,
  ExerciseExerciseType.SNOWBOARDING,
  ExerciseExerciseType.SNOWSHOEING,
  ExerciseExerciseType.SPEED_SKATING,
  ExerciseExerciseType.STAIRCLIMBER,
  ExerciseExerciseType.STATIONARY_BIKE,
  ExerciseExerciseType.STROLLER_WALK,
  ExerciseExerciseType.SURFING,
  ExerciseExerciseType.SWIMMING,
  ExerciseExerciseType.SWIMMING_OPEN_WATER,
  ExerciseExerciseType.SWIMMING_POOL,
  ExerciseExerciseType.TRAIL_RUN,
  ExerciseExerciseType.TREADMILL,
  ExerciseExerciseType.TREADMILL_WALK,
  ExerciseExerciseType.UNICYCLING,
  ExerciseExerciseType.WALKING,
  ExerciseExerciseType.WALK_WITH_WEIGHTS,
  ExerciseExerciseType.WHEELCHAIR,
]);

export const STEPS_EXERCISE_TYPES = new Set<ExerciseExerciseType>([
  ExerciseExerciseType.HIKING,
  ExerciseExerciseType.INCLINE_RUN,
  ExerciseExerciseType.INCLINE_WALK,
  ExerciseExerciseType.NORDIC_WALKING,
  ExerciseExerciseType.POWER_WALKING,
  ExerciseExerciseType.RUNNING,
  ExerciseExerciseType.STROLLER_WALK,
  ExerciseExerciseType.TRAIL_RUN,
  ExerciseExerciseType.TREADMILL,
  ExerciseExerciseType.TREADMILL_WALK,
  ExerciseExerciseType.WALKING,
  ExerciseExerciseType.WALK_WITH_WEIGHTS,
]);

export const SWIMMING_EXERCISE_TYPES = new Set<ExerciseExerciseType>([
  ExerciseExerciseType.SWIMMING,
  ExerciseExerciseType.SWIMMING_OPEN_WATER,
  ExerciseExerciseType.SWIMMING_POOL,
  ExerciseExerciseType.SYNCHRONIZED_SWIMMING,
  ExerciseExerciseType.WATER_AEROBICS,
  ExerciseExerciseType.WATER_JOGGING,
]);

export function getExerciseFromDataPoint(
  dataPoint: ExerciseDataPoint
): Exercise {
  return getDataPointValue("exercise", dataPoint);
}

export function getExerciseDataPointName(dataPoint: ExerciseDataPoint) {
  return dataPoint.name ?? "";
}

export function getExerciseDataPointId(dataPoint: ExerciseDataPoint) {
  const name = getExerciseDataPointName(dataPoint);
  const segments = name.split("/");
  return segments[segments.length - 1] || name;
}

export function getExerciseStartTime(exercise: Exercise) {
  return exercise.interval?.startTime ?? "";
}

export function getExerciseEndTime(exercise: Exercise) {
  return exercise.interval?.endTime ?? "";
}

export function formatExerciseTypeName(
  type?: ExerciseExerciseType | string
): string {
  if (!type || type === ExerciseExerciseType.EXERCISE_TYPE_UNSPECIFIED) {
    return "Workout";
  }

  return type
    .split("_")
    .map((word) =>
      EXERCISE_TYPE_ACRONYMS.has(word)
        ? word
        : word.charAt(0) + word.slice(1).toLowerCase()
    )
    .join(" ");
}

export function getExerciseDisplayName(exercise: Exercise) {
  return exercise.displayName || formatExerciseTypeName(exercise.exerciseType);
}

/** Parse a protobuf Duration JSON string (e.g. `"1800s"`) to milliseconds. */
export function parseDurationMillis(duration?: string) {
  if (!duration) {
    return 0;
  }

  const match = /^(-)?(\d+)(?:\.(\d+))?s$/.exec(duration);
  if (!match) {
    return 0;
  }

  const sign = match[1] ? -1 : 1;
  const seconds = Number(match[2]);
  const fraction = match[3] ? Number(`0.${match[3]}`) : 0;

  return sign * (seconds + fraction) * 1000;
}

export function getExerciseDurationMillis(exercise: Exercise) {
  if (exercise.activeDuration) {
    return parseDurationMillis(exercise.activeDuration);
  }

  const start = getExerciseStartTime(exercise);
  const end = getExerciseEndTime(exercise);

  if (start && end) {
    return dayjs(end).diff(dayjs(start));
  }

  return 0;
}

export function getExerciseDistanceKilometers(exercise: Exercise) {
  const millimeters = exercise.metricsSummary?.distanceMillimeters;
  if (millimeters == null || millimeters === 0) {
    return undefined;
  }

  return millimeters / 1_000_000;
}

export function getExerciseElevationMeters(exercise: Exercise) {
  const millimeters = exercise.metricsSummary?.elevationGainMillimeters ?? 0;
  return millimeters / 1000;
}

export function getExerciseSteps(exercise: Exercise) {
  const steps = exercise.metricsSummary?.steps;
  return steps != null ? Number(steps) : undefined;
}

export function getExerciseCalories(exercise: Exercise) {
  return exercise.metricsSummary?.caloriesKcal ?? 0;
}

export function getExerciseAverageHeartRate(exercise: Exercise) {
  const heartRate = exercise.metricsSummary?.averageHeartRateBeatsPerMinute;
  return heartRate != null ? Number(heartRate) : undefined;
}

export function isPossiblyTracked(dataPoint: ExerciseDataPoint) {
  const exercise = getExerciseFromDataPoint(dataPoint);
  return Boolean(
    exercise.exerciseMetadata?.hasGps &&
      exercise.metricsSummary?.distanceMillimeters
  );
}
