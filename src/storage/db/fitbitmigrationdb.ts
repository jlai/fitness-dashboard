import type { NutritionalValues } from "@/api/nutrition/types";
import { z } from "zod";

/** localStorage key written by the Fitbit app's migration backup. */
export const MIGRATION_BACKUP_STORAGE_KEY = "migration:fitbit-to-google";

/** Legacy Fitbit session token left in this browser by the previous app. */
export const FITBIT_AUTH_TOKEN_STORAGE_KEY = "auth:fitbit-token";

function hasLocalStorageKey(key: string) {
  if (typeof localStorage === "undefined") {
    return false;
  }

  return localStorage.getItem(key) !== null;
}

function removeLocalStorageKey(key: string) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(key);
}

export function hasFitbitAuthToken() {
  return hasLocalStorageKey(FITBIT_AUTH_TOKEN_STORAGE_KEY);
}

export function clearFitbitAuthToken() {
  removeLocalStorageKey(FITBIT_AUTH_TOKEN_STORAGE_KEY);
}

export function hasMigrationBackupStorage() {
  return hasLocalStorageKey(MIGRATION_BACKUP_STORAGE_KEY);
}

/** True when this browser still has Fitbit migration state to finish. */
export function needsFitbitMigrationRedirect() {
  return hasFitbitAuthToken() || hasMigrationBackupStorage();
}

export function clearMigrationBackupStorage() {
  removeLocalStorageKey(MIGRATION_BACKUP_STORAGE_KEY);
}

export type GoalPeriod = "daily" | "weekly" | "target";

export interface MigrationGoal {
  metric: string;
  period: GoalPeriod;
  value: number;
  units?: string;
}

/** Fitbit food unit as stored in the Fitbit migration backup. */
export interface FitbitFoodUnit {
  id: number;
  name: string;
  plural: string;
}

export type FitbitServing = {
  multiplier: number;
  servingSize: number;
  unit: FitbitFoodUnit;
};

/**
 * Custom food as stored in the Fitbit migration backup.
 * @see fitbit-api-migration commit 4bdfa6097ca74d9be9025359794bc69502b12052
 */
export interface MigrationFood {
  accessLevel: "PUBLIC" | "PRIVATE";
  foodId: number;
  name: string;
  brand?: string;
  locale?: string;
  calories: number;
  servings?: Array<FitbitServing>;
  defaultUnit?: FitbitFoodUnit;
  defaultServingSize?: number;
  unit?: FitbitFoodUnit;
  units: Array<FitbitFoodUnit>;
  nutritionalValues?: NutritionalValues;
}

export type MigrationMealFood = MigrationFood & {
  amount: number;
};

/**
 * Meal as stored in the Fitbit migration backup.
 * @see fitbit-api-migration commit 4bdfa6097ca74d9be9025359794bc69502b12052
 */
export interface MigrationMeal {
  id: string;
  name: string;
  description: string;
  mealFoods: Array<MigrationMealFood>;
}

export interface MigrationBackup {
  meals: Array<MigrationMeal>;
  customFoods: Array<MigrationFood>;
  goals: Array<MigrationGoal>;
}

const unitSchema = z.object({
  id: z.number(),
  name: z.string(),
  plural: z.string(),
});

const foodSchema = z.object({
  accessLevel: z.enum(["PUBLIC", "PRIVATE"]),
  foodId: z.number(),
  name: z.string(),
  brand: z.string().optional(),
  locale: z.string().optional(),
  calories: z.number(),
  servings: z
    .array(
      z.object({
        multiplier: z.number(),
        servingSize: z.number(),
        unit: unitSchema,
      }),
    )
    .optional(),
  defaultUnit: unitSchema.optional(),
  defaultServingSize: z.number().optional(),
  unit: unitSchema.optional(),
  units: z.array(unitSchema),
  nutritionalValues: z.record(z.string(), z.number()).optional(),
});

const migrationBackupSchema = z.object({
  customFoods: z.array(foodSchema),
  meals: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).transform(String),
      name: z.string(),
      description: z.string(),
      mealFoods: z.array(foodSchema.extend({ amount: z.number() })),
    }),
  ),
  goals: z.array(
    z.object({
      metric: z.string(),
      period: z.enum(["daily", "weekly", "target"]),
      value: z.number(),
      units: z.string().optional(),
    }),
  ),
});

export function parseMigrationBackupFile(text: string): MigrationBackup {
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  const result = migrationBackupSchema.safeParse(document);
  if (!result.success) {
    throw new Error(
      "The selected file is not a valid Fitbit migration backup.",
    );
  }
  return result.data;
}

const EMPTY_BACKUP: MigrationBackup = {
  meals: [],
  customFoods: [],
  goals: [],
};

function asArray<T>(value: unknown): Array<T> {
  return Array.isArray(value) ? value : [];
}

export function readMigrationBackup(): MigrationBackup {
  if (typeof localStorage === "undefined") {
    return { ...EMPTY_BACKUP };
  }

  const raw = localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY);
  if (!raw) {
    return { ...EMPTY_BACKUP };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...EMPTY_BACKUP };
    }

    const backup = parsed as Partial<MigrationBackup>;
    return {
      meals: asArray(backup.meals),
      customFoods: asArray(backup.customFoods),
      goals: asArray(backup.goals),
    };
  } catch {
    return { ...EMPTY_BACKUP };
  }
}

function writeBackup(backup: MigrationBackup) {
  localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, JSON.stringify(backup));
}

export function saveMeals(meals: Array<MigrationMeal>) {
  writeBackup({ ...readMigrationBackup(), meals });
}

export function saveCustomFoods(customFoods: Array<MigrationFood>) {
  writeBackup({ ...readMigrationBackup(), customFoods });
}

export function saveGoals(goals: Array<MigrationGoal>) {
  writeBackup({ ...readMigrationBackup(), goals });
}
