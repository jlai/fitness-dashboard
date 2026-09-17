import { z } from "zod";

import type { FoodDataPoint } from "@/api/nutrition/helpers";
import type { NutritionMacroGoals } from "@/api/nutrition/types";
import type {
  DistanceUnitSystem,
  SwimUnitSystem,
  TemperatureUnitSystem,
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";
import type { ClientGoal, ClientOnlyMeal } from "@/storage/db/dashdb";
import type { UserTile } from "@/storage/tiles";

import type { StoredData } from "./types";

/** Wrap a data schema in the StoredData envelope. */
export function storedDataSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    version: z.number().finite(),
    updateTime: z.string(),
  });
}

export const userTileSchema = z.object({
  id: z.string(),
  type: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number(),
  h: z.number(),
  settings: z.unknown().optional(),
}) as z.ZodType<UserTile>;

export const dashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  tiles: z.array(userTileSchema),
});

export type Dashboard = {
  id: string;
  name: string;
  tiles: UserTile[];
};

export type DashboardsData = {
  dashboards: Dashboard[];
};

export const dashboardsDataSchema = z.object({
  dashboards: z.array(dashboardSchema),
}) as z.ZodType<DashboardsData>;

export const clientGoalSchema = z.object({
  metric: z.string(),
  period: z.enum(["daily", "weekly", "target"]),
  value: z.number(),
  unit: z.string(),
}) as z.ZodType<ClientGoal>;

export type GoalsData = {
  goals: ClientGoal[];
};

export const goalsDataSchema = z.object({
  goals: z.array(clientGoalSchema),
}) as z.ZodType<GoalsData>;

export const mealServingSchema = z
  .object({
    amount: z.number().optional(),
    foodMeasurementUnit: z.string().optional(),
    foodMeasurementUnitDisplayName: z.string().optional(),
  })
  .passthrough();

export const clientOnlyMealFoodSchema = z.object({
  foodId: z.string(),
  serving: mealServingSchema,
});

export const clientOnlyMealSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  foods: z.array(clientOnlyMealFoodSchema),
}) as z.ZodType<ClientOnlyMeal>;

export type MealsData = {
  meals: ClientOnlyMeal[];
};

export const mealsDataSchema = z.object({
  meals: z.array(clientOnlyMealSchema),
}) as z.ZodType<MealsData>;

/** Pragmatic FoodDataPoint schema — keyed by resource `name`. */
export const foodDataPointSchema = z
  .object({ name: z.string() })
  .passthrough() as unknown as z.ZodType<FoodDataPoint>;

export type CustomFoodsData = {
  customFoods: FoodDataPoint[];
};

export const customFoodsDataSchema = z.object({
  customFoods: z.array(foodDataPointSchema),
}) as z.ZodType<CustomFoodsData>;

export const nutritionMacroGoalsSchema = z.object({
  calories: z.number(),
  sodium: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fiber: z.number(),
  fat: z.number(),
}) as z.ZodType<NutritionMacroGoals>;

export type SettingsPrefs = {
  weightUnit?: WeightUnitSystem;
  waterUnit?: WaterUnitSystem;
  distanceUnit?: DistanceUnitSystem;
  swimUnit?: SwimUnitSystem;
  temperatureUnit?: TemperatureUnitSystem;
  foodLogTotalsPosition?: "top" | "bottom" | "both";
  foodLogGoalsPosition?: "hidden" | "top" | "bottom" | "both";
  macroGoals?: NutritionMacroGoals;
  showNutritionLabel?: boolean;
  useNutritionGoalsForLabel?: boolean;
  foodLogShowCopyIndividualButton?: boolean;
  mapStyle?: string;
  increasedTileLimits?: boolean;
  clockHourCycle?: Intl.DateTimeFormatOptions["hourCycle"];
  dateFormatPattern?: string;
  numberFormatPattern?: string;
};

export const settingsPrefsSchema = z
  .object({
    weightUnit: z.string().optional(),
    waterUnit: z.string().optional(),
    distanceUnit: z.string().optional(),
    swimUnit: z.string().optional(),
    temperatureUnit: z.string().optional(),
    foodLogTotalsPosition: z.enum(["top", "bottom", "both"]).optional(),
    foodLogGoalsPosition: z
      .enum(["hidden", "top", "bottom", "both"])
      .optional(),
    macroGoals: nutritionMacroGoalsSchema.optional(),
    showNutritionLabel: z.boolean().optional(),
    useNutritionGoalsForLabel: z.boolean().optional(),
    foodLogShowCopyIndividualButton: z.boolean().optional(),
    mapStyle: z.string().optional(),
    increasedTileLimits: z.boolean().optional(),
    clockHourCycle: z.enum(["h11", "h12", "h23", "h24"]).optional(),
    dateFormatPattern: z.string().optional(),
    numberFormatPattern: z.string().optional(),
  })
  .passthrough() as z.ZodType<SettingsPrefs>;

export type SettingsData = {
  settings: SettingsPrefs;
};

export const settingsDataSchema = z.object({
  settings: settingsPrefsSchema,
}) as z.ZodType<SettingsData>;

export const dashboardsStoredSchema = storedDataSchema(dashboardsDataSchema);
export const goalsStoredSchema = storedDataSchema(goalsDataSchema);
export const mealsStoredSchema = storedDataSchema(mealsDataSchema);
export const customFoodsStoredSchema = storedDataSchema(customFoodsDataSchema);
export const settingsStoredSchema = storedDataSchema(settingsDataSchema);

export type StoredDashboards = StoredData<DashboardsData>;
export type StoredGoals = StoredData<GoalsData>;
export type StoredMeals = StoredData<MealsData>;
export type StoredCustomFoods = StoredData<CustomFoodsData>;
export type StoredSettings = StoredData<SettingsData>;
