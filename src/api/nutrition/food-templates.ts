import type { FoodDataPoint } from "./helpers";
import { mapFoodDataPoint } from "./helpers";
import { foodResourceName } from "./food-log";
import type { Food } from "./types";

export type FoodTemplate = {
  id: string;
  food: NonNullable<FoodDataPoint["food"]>;
  /** Server food reference retained only when migrating a legacy template. */
  customFood?: string;
};

export function hasSuspiciousServingMultipliers(food: Food): boolean {
  const servings = food.servings ?? [];
  return (
    new Set(servings.map((serving) => serving.unit.id)).size > 1 &&
    servings.every((serving) => serving.multiplier === 1)
  );
}

export function foodTemplateToFood(template: FoodTemplate): Food {
  return mapFoodDataPoint({
    name: foodResourceName(template.id),
    food: template.food,
  } as FoodDataPoint);
}
