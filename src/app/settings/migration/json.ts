import type {
  MigrationFood,
  MigrationGoal,
  MigrationMeal,
} from "@/storage/db/fitbitmigrationdb";

export const MIGRATION_JSON_FILENAME = "fitbit-migration.json";

export interface MigrationBackupDocument {
  customFoods: Array<MigrationFood>;
  meals: Array<MigrationMeal>;
  goals: Array<MigrationGoal>;
}

export function buildMigrationBackupDocument({
  customFoods,
  meals,
  goals,
}: {
  customFoods: Array<MigrationFood>;
  meals: Array<MigrationMeal>;
  goals: Array<MigrationGoal>;
}): MigrationBackupDocument {
  return {
    customFoods,
    meals,
    goals,
  };
}

export function stringifyMigrationBackup(document: MigrationBackupDocument) {
  return JSON.stringify(document, null, 2);
}
