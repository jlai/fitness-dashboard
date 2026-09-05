import { Dexie, Table, type EntityTable } from "dexie";

export interface Meal {
  id: number;
}

export interface Food {
  foodId: string;
}

export interface MigrationGoal {
  metric: string;
  period: "daily" | "weekly" | "target";
  value: number;
  units?: string;
}

export const db = new Dexie("FitbitMigrationDB") as Dexie & {
  meals: EntityTable<Meal, "id">;
  customFoods: EntityTable<Food, "foodId">;
  goals: Table<MigrationGoal, [string, string]>;
};

db.version(1).stores({
  meals: "++id",
  customFoods: "++foodId",
  goals: "[metric+period]"
});
