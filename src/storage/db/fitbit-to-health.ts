import type { Serving as NutritionLogServing } from "@generated/orval/fetch/google-health-api/models";

import {
  foodToDataPoint,
  type FoodDataPoint,
  getDataPointIdFromName,
} from "@/api/nutrition/helpers";
import type { Food, FoodUnit, Meal, MealFood } from "@/api/nutrition/types";
import type {
  FitbitFoodUnit,
  MigrationFood,
  MigrationMeal,
  MigrationMealFood,
} from "@/storage/db/fitbitmigrationdb";
import type { ClientOnlyMeal, ClientOnlyMealFood } from "@/storage/db/dashdb";

function asUnit(unit: FitbitFoodUnit): FoodUnit {
  return {
    id: String(unit.id),
    name: unit.name,
    plural: unit.plural,
  };
}

function unitsFromMigrationFood(food: MigrationFood): Array<FoodUnit> {
  return (food.units ?? []).flatMap((unit) =>
    typeof unit === "object" && unit != null ? [asUnit(unit)] : [],
  );
}

export function migrationFoodToFood(food: MigrationFood): Food {
  const unitObjects = unitsFromMigrationFood(food);
  const servings =
    food.servings?.map((serving) => ({
      multiplier: serving.multiplier,
      servingSize: serving.servingSize,
      unit: asUnit(serving.unit),
    })) ??
    unitObjects.map((unit) => ({
      multiplier: 1,
      servingSize: 1,
      unit,
    }));
  const defaultUnit = food.defaultUnit
    ? asUnit(food.defaultUnit)
    : food.unit
      ? asUnit(food.unit)
      : servings[0]?.unit;

  return {
    accessLevel: food.accessLevel,
    foodId: String(food.foodId),
    name: food.name,
    brand: food.brand,
    locale: food.locale,
    calories: food.calories,
    servings,
    defaultUnit,
    defaultServingSize: food.defaultServingSize ?? 1,
    unit: food.unit ? asUnit(food.unit) : defaultUnit,
    units: [...new Set(servings.map((serving) => serving.unit.id))],
    nutritionalValues: food.nutritionalValues,
  };
}

export function migrationFoodToDataPoint(food: MigrationFood): FoodDataPoint {
  return foodToDataPoint(migrationFoodToFood(food));
}

function unitFromMealFood(food: MigrationMealFood): FitbitFoodUnit | undefined {
  return food.unit ?? food.defaultUnit ?? food.units?.[0];
}

export function servingFromMigrationMealFood(
  food: MigrationMealFood,
): NutritionLogServing {
  const unit = unitFromMealFood(food);
  const unitId = unit != null ? String(unit.id) : "";

  return {
    amount: food.amount,
    ...(unitId
      ? {
          foodMeasurementUnit: `users/me/dataTypes/food-measurement-unit/dataPoints/${unitId}`,
        }
      : {}),
    ...(unit?.name ? { foodMeasurementUnitDisplayName: unit.name } : {}),
  };
}

export function migrationMealToClientOnlyMeal(
  meal: MigrationMeal,
): ClientOnlyMeal {
  return {
    id: String(meal.id),
    name: meal.name,
    description: meal.description,
    foods: meal.mealFoods.map((food) => ({
      foodId: String(food.foodId),
      serving: servingFromMigrationMealFood(food),
    })),
  };
}

export function privateMigrationFoodsFromMeal(
  meal: MigrationMeal,
): Array<MigrationFood> {
  return meal.mealFoods.filter((food) => food.accessLevel === "PRIVATE");
}

function unitIdFromServing(serving: NutritionLogServing) {
  return getDataPointIdFromName(serving.foodMeasurementUnit);
}

export function foodUnitFromNutritionLogServing(
  serving: NutritionLogServing,
  food?: Food,
): FoodUnit {
  const id = unitIdFromServing(serving);
  const fromFood =
    food?.servings?.find((item) => item.unit.id === id)?.unit ??
    (food?.defaultUnit?.id === id ? food.defaultUnit : undefined) ??
    (food?.unit?.id === id ? food.unit : undefined);
  const name = serving.foodMeasurementUnitDisplayName ?? fromFood?.name ?? "";

  return {
    id,
    name,
    plural: fromFood?.plural ?? name,
  };
}

export function servingFromMealFood(food: MealFood): NutritionLogServing {
  const unit = food.unit ?? food.defaultUnit;
  const unitId = unit?.id ?? "";

  return {
    amount: food.amount,
    ...(unitId
      ? {
          foodMeasurementUnit: `users/me/dataTypes/food-measurement-unit/dataPoints/${unitId}`,
        }
      : {}),
    ...(unit?.name ? { foodMeasurementUnitDisplayName: unit.name } : {}),
  };
}

export function mealToClientOnlyMeal(meal: Meal): ClientOnlyMeal {
  return {
    id: meal.id,
    name: meal.name,
    description: meal.description,
    foods: meal.mealFoods.map((food) => ({
      foodId: String(food.foodId),
      serving: servingFromMealFood(food),
    })),
  };
}

export function mealFoodFromResolvedFood(
  food: Food,
  item: ClientOnlyMealFood,
): MealFood {
  return {
    ...food,
    amount: item.serving.amount ?? food.defaultServingSize ?? 1,
    unit: foodUnitFromNutritionLogServing(item.serving, food),
  };
}
