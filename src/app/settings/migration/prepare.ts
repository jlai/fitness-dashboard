import type { Food, FoodUnit, Meal } from "@/api/nutrition";
import type {
  MigrationFood,
  MigrationGoal,
  MigrationMeal,
} from "@/storage/db/fitbitmigrationdb";

export interface PrepareMigrationFoodOptions {
  unitsById: Map<number, FoodUnit>;
  getFoodDetails: (foodId: number) => Promise<Food>;
}

function expandUnits(
  units: Array<number> | Array<FoodUnit> | undefined,
  unitsById: Map<number, FoodUnit>
) {
  if (!units) {
    return [];
  }

  return units.flatMap((unit) => {
    if (typeof unit === "object") {
      return [unit];
    }

    const details = unitsById.get(unit);
    return details ? [details] : [];
  });
}

export async function prepareFoodForMigration(
  food: Food,
  { unitsById, getFoodDetails }: PrepareMigrationFoodOptions
): Promise<MigrationFood> {
  const {
    creatorEncodedId: _creatorEncodedId,
    units,
    ...rest
  } = food as Food & { creatorEncodedId?: unknown };

  let nutritionalValues = rest.nutritionalValues;

  try {
    const details = await getFoodDetails(food.foodId);
    if (details.nutritionalValues) {
      nutritionalValues = details.nutritionalValues;
    }
  } catch {
    // Fitbit does not always return nutrition facts for a food.
  }

  return {
    ...rest,
    units: expandUnits(units, unitsById),
    nutritionalValues,
  };
}

export async function prepareMealForMigration(
  meal: Meal,
  options: PrepareMigrationFoodOptions
): Promise<MigrationMeal> {
  return {
    ...meal,
    mealFoods: await Promise.all(
      meal.mealFoods.map(async (food) => ({
        ...(await prepareFoodForMigration(food, options)),
        amount: food.amount,
      }))
    ),
  };
}

export async function prepareMigrationBackup({
  customFoods,
  meals,
  goals,
  unitsById,
  getFoodDetails,
}: {
  customFoods: Array<Food>;
  meals: Array<Meal>;
  goals: Array<MigrationGoal>;
  unitsById: Map<number, FoodUnit>;
  getFoodDetails: (foodId: number) => Promise<Food>;
}) {
  const options = { unitsById, getFoodDetails };

  return {
    customFoods: await Promise.all(
      customFoods.map((food) => prepareFoodForMigration(food, options))
    ),
    meals: await Promise.all(
      meals.map((meal) => prepareMealForMigration(meal, options))
    ),
    goals,
  };
}
