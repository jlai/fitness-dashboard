import { Dexie, type EntityTable } from "dexie";
import type { Serving } from "@generated/orval/fetch/google-health-api/models";

import type { FoodDataPoint } from "@/api/nutrition/helpers";

export interface ClientOnlyMealFood {
  foodId: string;
  serving: Serving;
}

export interface ClientOnlyMeal {
  id: string;
  name: string;
  description: string;
  foods: Array<ClientOnlyMealFood>;
}

export const db = new Dexie("dashdb") as Dexie & {
  clientOnlyFoods: EntityTable<FoodDataPoint, "name">;
  clientOnlyMeals: EntityTable<ClientOnlyMeal, "id">;
};

db.version(1).stores({
  clientOnlyFoods: "name",
  clientOnlyMeals: "id",
});
