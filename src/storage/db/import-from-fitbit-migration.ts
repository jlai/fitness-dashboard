import { db as dashDb, type ClientGoal } from "@/storage/db/dashdb";
import {
  db as fitbitMigrationDb,
  type MigrationGoal,
} from "@/storage/db/fitbitmigrationdb";

import {
  migrationFoodToDataPoint,
  migrationMealToClientOnlyMeal,
  privateMigrationFoodsFromMeal,
} from "./fitbit-to-health";

let importPromise: Promise<void> | null = null;

export function migrationGoalToClientGoal(goal: MigrationGoal): ClientGoal {
  return {
    metric: goal.metric,
    period: goal.period,
    value: goal.value,
    unit: goal.units ?? "",
  };
}

function goalKey(goal: Pick<ClientGoal, "metric" | "period">) {
  return `${goal.metric}\0${goal.period}`;
}

async function importMissingFitbitRecords() {
  const [customFoods, meals, migrationGoals] = await Promise.all([
    fitbitMigrationDb.customFoods.toArray(),
    fitbitMigrationDb.meals.toArray(),
    fitbitMigrationDb.goals.toArray(),
  ]);

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
  const clientMeals = meals.map(migrationMealToClientOnlyMeal);

  const clientGoals = migrationGoals.map(migrationGoalToClientGoal);

  await dashDb.transaction(
    "rw",
    dashDb.clientOnlyFoods,
    dashDb.clientOnlyMeals,
    dashDb.clientOnlyGoals,
    async () => {
      const existingFoodNames = new Set(
        await dashDb.clientOnlyFoods.toCollection().primaryKeys(),
      );
      const existingMealIds = new Set(
        await dashDb.clientOnlyMeals.toCollection().primaryKeys(),
      );
      const existingGoalKeys = new Set(
        (await dashDb.clientOnlyGoals.toCollection().primaryKeys()).map(
          (key) => `${key[0]}\0${key[1]}`,
        ),
      );

      const foodsToAdd = [...foodDataPointsByName.values()].filter(
        (food) => !existingFoodNames.has(food.name!),
      );
      const mealsToAdd = clientMeals.filter(
        (meal) => !existingMealIds.has(meal.id),
      );
      const goalsToAdd = clientGoals.filter(
        (goal) => !existingGoalKeys.has(goalKey(goal)),
      );

      if (foodsToAdd.length > 0) {
        await dashDb.clientOnlyFoods.bulkAdd(foodsToAdd);
      }
      if (mealsToAdd.length > 0) {
        await dashDb.clientOnlyMeals.bulkAdd(mealsToAdd);
      }
      if (goalsToAdd.length > 0) {
        await dashDb.clientOnlyGoals.bulkAdd(goalsToAdd);
      }
    },
  );
}

/**
 * Copies custom foods, meals, and goals from FitbitMigrationDB into dashdb
 * once per missing record. Private foods referenced by meals are stored as
 * Food datapoints even if they were not in the customFoods table.
 */
export function importFromFitbitMigrationDb() {
  if (!importPromise) {
    importPromise = importMissingFitbitRecords().catch(() => {
      importPromise = null;
    });
  }

  return importPromise;
}

export function resetImportFromFitbitMigrationDb() {
  importPromise = null;
}
