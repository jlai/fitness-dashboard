"use client";

import { getDefaultStore } from "jotai";

import {
  parseDistanceUnit,
  parseSwimUnit,
  parseTemperatureUnit,
  parseWaterUnit,
  parseWeightUnit,
} from "@/api/user";
import { db as dashDb } from "@/storage/db/dashdb";
import { customFoodsAtom } from "@/storage/custom-foods";
import { goalsAtom } from "@/storage/goals";
import { mealsAtom } from "@/storage/meals";
import { settingsBlobAtom, DEFAULT_FDA_MACRO_GOALS } from "@/storage/settings";
import { dashboardsAtom, type UserTile } from "@/storage/tiles";
import {
  createDefaultDashboardsData,
  createDefaultSettingsData,
  type CustomFoodsData,
  type DashboardsData,
  type GoalsData,
  type MealsData,
  type SettingsData,
  type SettingsPrefs,
} from "@/storage/settings-storage";

function readJsonLocalStorage(key: string): unknown {
  if (typeof localStorage === "undefined") {
    return undefined;
  }
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function readUnitPreference<T extends string>(
  canonicalKey: string,
  legacyKey: string,
  parse: (value: unknown) => T | undefined,
): T | undefined {
  const canonical = readJsonLocalStorage(canonicalKey);
  if (canonical !== undefined) {
    return parse(canonical);
  }
  const legacy = readJsonLocalStorage(legacyKey);
  if (legacy !== undefined) {
    return parse(legacy);
  }
  return undefined;
}

function readLegacySettingsPrefs(): SettingsPrefs {
  const prefs: SettingsPrefs = {};

  const weightUnit = readUnitPreference(
    "units:weight",
    "unit:weight",
    parseWeightUnit,
  );
  if (weightUnit) prefs.weightUnit = weightUnit;

  const waterUnit = readUnitPreference(
    "units:water",
    "unit:water",
    parseWaterUnit,
  );
  if (waterUnit) prefs.waterUnit = waterUnit;

  const distanceUnit = readUnitPreference(
    "units:distance",
    "unit:distance",
    parseDistanceUnit,
  );
  if (distanceUnit) prefs.distanceUnit = distanceUnit;

  const swimUnit = readUnitPreference(
    "units:swim",
    "unit:swim",
    parseSwimUnit,
  );
  if (swimUnit) prefs.swimUnit = swimUnit;

  const temperatureUnit = readUnitPreference(
    "units:temperature",
    "unit:temperature",
    parseTemperatureUnit,
  );
  if (temperatureUnit) prefs.temperatureUnit = temperatureUnit;

  const totalsPosition = readJsonLocalStorage("food-log:totals-position");
  if (
    totalsPosition === "top" ||
    totalsPosition === "bottom" ||
    totalsPosition === "both"
  ) {
    prefs.foodLogTotalsPosition = totalsPosition;
  }

  const goalsPosition = readJsonLocalStorage("macro-goals:position");
  if (
    goalsPosition === "hidden" ||
    goalsPosition === "top" ||
    goalsPosition === "bottom" ||
    goalsPosition === "both"
  ) {
    prefs.foodLogGoalsPosition = goalsPosition;
  }

  const macroGoals = readJsonLocalStorage("nutrition-goals:macros");
  if (
    macroGoals &&
    typeof macroGoals === "object" &&
    "calories" in macroGoals
  ) {
    prefs.macroGoals = {
      ...DEFAULT_FDA_MACRO_GOALS,
      ...(macroGoals as Partial<typeof DEFAULT_FDA_MACRO_GOALS>),
    };
  }

  const showLabel = readJsonLocalStorage("nutrition-facts:show-label");
  if (typeof showLabel === "boolean") {
    prefs.showNutritionLabel = showLabel;
  }

  const useForLabel = readJsonLocalStorage("macro-goals:use-for-label");
  if (typeof useForLabel === "boolean") {
    prefs.useNutritionGoalsForLabel = useForLabel;
  }

  const showCopy = readJsonLocalStorage("food-log:show-copy-individual-button");
  if (typeof showCopy === "boolean") {
    prefs.foodLogShowCopyIndividualButton = showCopy;
  }

  const mapStyle = readJsonLocalStorage("map:style");
  if (typeof mapStyle === "string") {
    prefs.mapStyle = mapStyle;
  }

  const increased = readJsonLocalStorage("dashboard:increased-tile-limits");
  if (typeof increased === "boolean") {
    prefs.increasedTileLimits = increased;
  }

  const hourCycle = readJsonLocalStorage("locale:clock-hour-cycle");
  if (
    hourCycle === "h11" ||
    hourCycle === "h12" ||
    hourCycle === "h23" ||
    hourCycle === "h24"
  ) {
    prefs.clockHourCycle = hourCycle;
  }

  const datePattern = readJsonLocalStorage("locale:date-format-pattern");
  if (typeof datePattern === "string") {
    prefs.dateFormatPattern = datePattern;
  }

  const numberPattern = readJsonLocalStorage("locale:number-format-pattern");
  if (typeof numberPattern === "string") {
    prefs.numberFormatPattern = numberPattern;
  }

  return prefs;
}

function readLegacyDashboards(): DashboardsData {
  const tiles = readJsonLocalStorage("dashboard-tiles");
  if (Array.isArray(tiles) && tiles.length > 0) {
    return {
      dashboards: [
        {
          id: crypto.randomUUID(),
          name: "Main",
          tiles: tiles as UserTile[],
        },
      ],
    };
  }
  return createDefaultDashboardsData();
}

async function readLegacyGoals(): Promise<GoalsData> {
  const goals = await dashDb.clientOnlyGoals.toArray();
  return { goals };
}

async function readLegacyMeals(): Promise<MealsData> {
  const meals = await dashDb.clientOnlyMeals.toArray();
  return { meals };
}

async function readLegacyCustomFoods(): Promise<CustomFoodsData> {
  const customFoods = await dashDb.clientOnlyFoods.toArray();
  return { customFoods };
}

/**
 * Import legacy localStorage + Dexie data into the current SettingsStorage
 * backend via jotai atoms (so Suspense caches stay in sync).
 */
export async function importLegacySettings() {
  const settingsData: SettingsData = {
    settings: {
      ...createDefaultSettingsData().settings,
      ...readLegacySettingsPrefs(),
    },
  };
  const dashboards = readLegacyDashboards();
  const [goals, meals, customFoods] = await Promise.all([
    readLegacyGoals(),
    readLegacyMeals(),
    readLegacyCustomFoods(),
  ]);

  const store = getDefaultStore();
  await store.set(settingsBlobAtom, settingsData);
  await store.set(dashboardsAtom, dashboards);
  await store.set(goalsAtom, goals);
  await store.set(mealsAtom, meals);
  await store.set(customFoodsAtom, customFoods);
}
