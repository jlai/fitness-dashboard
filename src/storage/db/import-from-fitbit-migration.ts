import {
  readMigrationBackup,
  type MigrationGoal,
} from "@/storage/db/fitbitmigrationdb";
import type {
  ClientGoal,
  ClientOnlyFoodsData,
  ClientOnlyGoalsData,
  MealsData,
} from "@/storage/settings-storage/schemas";

import {
  migrationFoodToDataPoint,
  migrationMealToClientOnlyMeal,
  privateMigrationFoodsFromMeal,
} from "./fitbit-to-health";

export function migrationGoalToClientGoal(goal: MigrationGoal): ClientGoal {
  return {
    metric: goal.metric,
    period: goal.period,
    value: goal.value,
    unit: goal.units ?? "",
  };
}

/**
 * Converts the Fitbit localStorage backup (meals, custom foods, goals) into
 * SettingsStorage blob shapes. Private foods referenced by meals are included
 * even if they were not in the backup customFoods list.
 */
export function readFitbitMigrationSettings(): {
  clientOnlyGoals: ClientOnlyGoalsData;
  meals: MealsData;
  clientOnlyFoods: ClientOnlyFoodsData;
} {
  const { customFoods, meals, goals } = readMigrationBackup();

  const foodDataPointsByName = new Map(
    [
      ...customFoods.map(migrationFoodToDataPoint),
      ...meals.flatMap((meal) =>
        privateMigrationFoodsFromMeal(meal).map(migrationFoodToDataPoint),
      ),
    ]
      .filter((food) => food.name)
      .map((food) => [food.name!, food] as const),
  );

  return {
    clientOnlyFoods: {
      clientOnlyFoods: [...foodDataPointsByName.values()],
    },
    meals: { meals: meals.map(migrationMealToClientOnlyMeal) },
    clientOnlyGoals: { clientOnlyGoals: goals.map(migrationGoalToClientGoal) },
  };
}
