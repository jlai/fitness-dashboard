import {
  DirectionsBike,
  DirectionsRun,
  DirectionsWalk,
  FitnessCenter,
  Pool,
  Sports,
} from "@mui/icons-material";

import { ActivityType } from "@/api/activity";
import { FoodUnit } from "@/api/nutrition";

// Common food units
export const commonFoodUnits: Array<FoodUnit> = [
  { id: 147, name: "gram", plural: "grams" },
  { id: 226, name: "oz", plural: "oz" },
  { id: 180, name: "lb", plural: "lbs" },
  { id: 389, name: "kg", plural: "kg" },
];

// Common activities
export const commonActivityTypes: Array<ActivityType> = [
  {
    id: 90013,
    name: "Walk",
    hasSpeed: true,
  },
  {
    id: 90009,
    name: "Run",
    hasSpeed: true,
  },
  {
    id: 90001,
    name: "Bike",
    hasSpeed: true,
  },
  {
    id: 3000,
    name: "Workout",
  },
  {
    id: 15000,
    name: "Sport",
  },
  {
    id: 90024,
    name: "Swim",
  },
];

export const ACTIVITY_TYPES_WITH_STEPS = new Set([90013, 90009]);
export const SWIMMING_ACTIVITY_TYPE = 90024;

export const ACTIVITY_ICONS: Record<string, React.ComponentType> = {
  90013: DirectionsWalk,
  90009: DirectionsRun,
  90001: DirectionsBike,
  3000: FitnessCenter,
  15000: Sports,
  90024: Pool,
};
