import {
  DirectionsBike,
  DirectionsRun,
  DirectionsWalk,
  FitnessCenter,
  Pool,
  Sports,
} from "@mui/icons-material";

import { ExerciseExerciseType } from "@generated/orval/fetch/google-health-api/models";

import { ExerciseType } from "@/api/exercise";
import { FoodUnit } from "@/api/nutrition";

// Common food units
export const commonFoodUnits: Array<FoodUnit> = [
  { id: 147, name: "gram", plural: "grams" },
  { id: 226, name: "oz", plural: "oz" },
  { id: 180, name: "lb", plural: "lbs" },
  { id: 389, name: "kg", plural: "kg" },
];

// Common activities
export const commonActivityTypes: Array<ExerciseType> = [
  {
    id: ExerciseExerciseType.WALKING,
    name: "Walk",
    hasSpeed: true,
  },
  {
    id: ExerciseExerciseType.RUNNING,
    name: "Run",
    hasSpeed: true,
  },
  {
    id: ExerciseExerciseType.BIKING,
    name: "Bike",
    hasSpeed: true,
  },
  {
    id: ExerciseExerciseType.WORKOUT,
    name: "Workout",
  },
  {
    id: ExerciseExerciseType.SPORT,
    name: "Sport",
  },
  {
    id: ExerciseExerciseType.SWIMMING,
    name: "Swim",
  },
];

export const ACTIVITY_ICONS: Record<string, React.ComponentType> = {
  [ExerciseExerciseType.WALKING]: DirectionsWalk,
  [ExerciseExerciseType.INCLINE_WALK]: DirectionsWalk,
  [ExerciseExerciseType.NORDIC_WALKING]: DirectionsWalk,
  [ExerciseExerciseType.POWER_WALKING]: DirectionsWalk,
  [ExerciseExerciseType.STROLLER_WALK]: DirectionsWalk,
  [ExerciseExerciseType.TREADMILL_WALK]: DirectionsWalk,
  [ExerciseExerciseType.WALK_WITH_WEIGHTS]: DirectionsWalk,
  [ExerciseExerciseType.RUNNING]: DirectionsRun,
  [ExerciseExerciseType.INCLINE_RUN]: DirectionsRun,
  [ExerciseExerciseType.TRAIL_RUN]: DirectionsRun,
  [ExerciseExerciseType.TREADMILL]: DirectionsRun,
  [ExerciseExerciseType.BIKING]: DirectionsBike,
  [ExerciseExerciseType.ELECTRIC_BIKE]: DirectionsBike,
  [ExerciseExerciseType.HAND_CYCLING]: DirectionsBike,
  [ExerciseExerciseType.MOUNTAIN_BIKE]: DirectionsBike,
  [ExerciseExerciseType.OUTDOOR_BIKE]: DirectionsBike,
  [ExerciseExerciseType.STATIONARY_BIKE]: DirectionsBike,
  [ExerciseExerciseType.WORKOUT]: FitnessCenter,
  [ExerciseExerciseType.STRENGTH_TRAINING]: FitnessCenter,
  [ExerciseExerciseType.WEIGHTLIFTING]: FitnessCenter,
  [ExerciseExerciseType.WEIGHTS]: FitnessCenter,
  [ExerciseExerciseType.SPORT]: Sports,
  [ExerciseExerciseType.SWIMMING]: Pool,
  [ExerciseExerciseType.SWIMMING_OPEN_WATER]: Pool,
  [ExerciseExerciseType.SWIMMING_POOL]: Pool,
};
