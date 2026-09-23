import type { Food, FoodUnit } from "@/api/nutrition/types";

export const MIGRATION_BACKUP_STORAGE_KEY = "migration:fitbit-to-google";

export type GoalPeriod = "daily" | "weekly" | "target";

export interface MigrationGoal {
  metric: string;
  period: GoalPeriod;
  value: number;
  units?: string;
}

export type MigrationFood = Omit<Food, "units"> & {
  units: Array<FoodUnit>;
};

export type MigrationMealFood = MigrationFood & {
  amount: number;
};

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

function readBackup(): MigrationBackup {
  if (typeof localStorage === "undefined") {
    return { ...EMPTY_BACKUP };
  }

  const raw = localStorage.getItem(MIGRATION_BACKUP_STORAGE_KEY);
  if (!raw) {
    return { ...EMPTY_BACKUP };
  }

  return { ...EMPTY_BACKUP, ...JSON.parse(raw) };
}

function writeBackup(backup: MigrationBackup) {
  localStorage.setItem(MIGRATION_BACKUP_STORAGE_KEY, JSON.stringify(backup));
}

export function saveMeals(meals: Array<MigrationMeal>) {
  writeBackup({ ...readBackup(), meals });
}

export function saveCustomFoods(customFoods: Array<MigrationFood>) {
  writeBackup({ ...readBackup(), customFoods });
}

export function saveGoals(goals: Array<MigrationGoal>) {
  writeBackup({ ...readBackup(), goals });
}
