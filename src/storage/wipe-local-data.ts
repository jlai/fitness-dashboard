import { db as dashDb } from "@/storage/db/dashdb";
import { db as fitbitMigrationDb } from "@/storage/db/fitbitmigrationdb";
import { resetImportFromFitbitMigrationDb } from "@/storage/db/import-from-fitbit-migration";

/** Erase all IndexedDB (Dexie) databases and localStorage for this origin. */
export async function wipeLocalData() {
  resetImportFromFitbitMigrationDb();
  await Promise.all([dashDb.delete(), fitbitMigrationDb.delete()]);
  localStorage.clear();
}
