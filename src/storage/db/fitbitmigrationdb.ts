import { Dexie, type EntityTable } from "dexie";

export interface Meal {
  id: number;
}

export interface Food {
  foodId: string;
}

export const db = new Dexie("FitbitMigrationDB") as Dexie & {
  meals: EntityTable<Meal, "id">;
  customFoods: EntityTable<Food, "foodId">;
};

db.version(1).stores({
  meals: "++id",
  customFoods: "++foodId"
});
