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
  },
  {
    id: 90009,
    name: "Run",
  },
];

export const ACTIVITY_TYPES_WITH_STEPS = new Set([90013, 90009]);
