import type { NutritionalValues } from "@/api/nutrition/types";

/** localStorage key written by the Fitbit app's migration backup. */
export const MIGRATION_BACKUP_STORAGE_KEY = "migration:fitbit-to-google";

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
