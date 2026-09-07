import { db as fitbitMigrationDb } from "@/storage/db/fitbitmigrationdb";
import { db as dashDb } from "@/storage/db/dashdb";

import {
  migrationFoodToDataPoint,
  migrationMealToClientOnlyMeal,
  privateMigrationFoodsFromMeal,
} from "./fitbit-to-health";

let importPromise: Promise<void> | null = null;

async function importMissingFitbitFoodsAndMeals() {
  const [customFoods, meals] = await Promise.all([
    fitbitMigrationDb.customFoods.toArray(),
    fitbitMigrationDb.meals.toArray(),
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

  await dashDb.transaction(
    "rw",
    dashDb.clientOnlyFoods,
    dashDb.clientOnlyMeals,
    async () => {
      const existingFoodNames = new Set(
        await dashDb.clientOnlyFoods.toCollection().primaryKeys(),
      );
      const existingMealIds = new Set(
        await dashDb.clientOnlyMeals.toCollection().primaryKeys(),
      );

      const foodsToAdd = [...foodDataPointsByName.values()].filter(
        (food) => !existingFoodNames.has(food.name!),
      );
      const mealsToAdd = clientMeals.filter(
        (meal) => !existingMealIds.has(meal.id),
      );

      if (foodsToAdd.length > 0) {
        await dashDb.clientOnlyFoods.bulkAdd(foodsToAdd);
      }
      if (mealsToAdd.length > 0) {
        await dashDb.clientOnlyMeals.bulkAdd(mealsToAdd);
      }
    },
  );
}

/**
 * Copies custom foods and meals from FitbitMigrationDB into dashdb once per
 * missing record. Private foods referenced by meals are stored as Food
 * datapoints even if they were not in the customFoods table.
 */
export function importFromFitbitMigrationDb() {
  if (!importPromise) {
    importPromise = importMissingFitbitFoodsAndMeals().catch(() => {
      importPromise = null;
    });
  }

  return importPromise;
}
