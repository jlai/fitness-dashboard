"use client";

import { atom, type WritableAtom } from "jotai";
import { RESET } from "jotai/utils";
import { atomEffect } from "jotai-effect";

import { NutritionMacroGoals } from "@/api/nutrition";
import {
  DistanceUnitSystem,
  SwimUnitSystem,
  TemperatureUnitSystem,
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";
import {
  createDefaultSettingsData,
  createSettingsBlobAtom,
  SETTINGS_STORAGE_KEYS,
  settingsStoredSchema,
  type SettingsPrefs,
} from "@/storage/settings-storage";
import {
  PATTERN_TO_LOCALE,
  setNumberFormatLocale,
} from "@/utils/number-formats";
import { setDateFormatLocale } from "@/utils/date-formats";

export type { SettingsPrefs };

export const settingsBlobAtom = createSettingsBlobAtom({
  key: SETTINGS_STORAGE_KEYS.settings,
  schema: settingsStoredSchema,
  defaultData: createDefaultSettingsData,
});

type FieldUpdate<T> = T | ((prev: T) => T) | typeof RESET;

function isPromise<T>(value: T | Promise<T>): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

function createSettingsFieldAtom<K extends keyof SettingsPrefs>(
  field: K,
  defaultValue: NonNullable<SettingsPrefs[K]>,
): WritableAtom<
  NonNullable<SettingsPrefs[K]> | Promise<NonNullable<SettingsPrefs[K]>>,
  [FieldUpdate<NonNullable<SettingsPrefs[K]>>],
  Promise<void>
> {
  return atom(
    (get) => {
      const dataOrPromise = get(settingsBlobAtom);

      if (isPromise(dataOrPromise)) {
        return dataOrPromise.then(
          (data) =>
            (data.settings[field] ?? defaultValue) as NonNullable<
              SettingsPrefs[K]
            >,
        );
      }

      return (dataOrPromise.settings[field] ?? defaultValue) as NonNullable<
        SettingsPrefs[K]
      >;
    },
    async (get, set, update: FieldUpdate<NonNullable<SettingsPrefs[K]>>) => {
      const data = await get(settingsBlobAtom);
      const prev = (data.settings[field] ?? defaultValue) as NonNullable<
        SettingsPrefs[K]
      >;
      const next =
        update === RESET
          ? defaultValue
          : typeof update === "function"
            ? (update as (prev: NonNullable<SettingsPrefs[K]>) => NonNullable<
                SettingsPrefs[K]
              >)(prev)
            : update;

      await set(settingsBlobAtom, {
        settings: {
          ...data.settings,
          [field]: next,
        },
      });
    },
  );
}

function createOptionalSettingsFieldAtom<T>(
  field: keyof SettingsPrefs,
): WritableAtom<T | undefined | Promise<T | undefined>, [FieldUpdate<T | undefined>], Promise<void>> {
  return atom(
    (get) => {
      const dataOrPromise = get(settingsBlobAtom);

      if (isPromise(dataOrPromise)) {
        return dataOrPromise.then(
          (data) => data.settings[field] as T | undefined,
        );
      }

      return dataOrPromise.settings[field] as T | undefined;
    },
    async (get, set, update: FieldUpdate<T | undefined>) => {
      const data = await get(settingsBlobAtom);
      const prev = data.settings[field] as T | undefined;
      const next =
        update === RESET
          ? undefined
          : typeof update === "function"
            ? (update as (prev: T | undefined) => T | undefined)(prev)
            : update;

      const settings = { ...data.settings };
      if (next === undefined) {
        delete settings[field];
      } else {
        (settings as Record<string, unknown>)[field] = next;
      }

      await set(settingsBlobAtom, { settings });
    },
  );
}

export const weightUnitAtom =
  createOptionalSettingsFieldAtom<WeightUnitSystem>("weightUnit");

export const waterUnitAtom =
  createOptionalSettingsFieldAtom<WaterUnitSystem>("waterUnit");

export const distanceUnitAtom =
  createOptionalSettingsFieldAtom<DistanceUnitSystem>("distanceUnit");

export const swimUnitAtom =
  createOptionalSettingsFieldAtom<SwimUnitSystem>("swimUnit");

export const temperatureUnitAtom =
  createOptionalSettingsFieldAtom<TemperatureUnitSystem>("temperatureUnit");

const UNIT_SETTING_KEYS = [
  "weightUnit",
  "waterUnit",
  "distanceUnit",
  "swimUnit",
  "temperatureUnit",
] as const satisfies ReadonlyArray<keyof SettingsPrefs>;

/** Clear all local unit overrides in a single blob write (avoids RMW races). */
export const clearUnitSettingsAtom = atom(null, async (get, set) => {
  const data = await get(settingsBlobAtom);
  const settings = { ...data.settings };

  for (const key of UNIT_SETTING_KEYS) {
    delete settings[key];
  }

  await set(settingsBlobAtom, { settings });
});

export const allUnitsConfiguredAtom = atom((get) => {
  const weight = get(weightUnitAtom);
  const water = get(waterUnitAtom);
  const distance = get(distanceUnitAtom);

  if (isPromise(weight) || isPromise(water) || isPromise(distance)) {
    return Promise.all([weight, water, distance]).then(
      ([w, wa, d]) => Boolean(w && wa && d),
    );
  }

  return Boolean(weight && water && distance);
});

export const foodLogTotalsPositionAtom = createSettingsFieldAtom(
  "foodLogTotalsPosition",
  "bottom",
);

export const foodLogGoalsPositionAtom = createSettingsFieldAtom(
  "foodLogGoalsPosition",
  "hidden",
);

export const DEFAULT_FDA_MACRO_GOALS: NutritionMacroGoals = {
  calories: 2000,
  sodium: 2300,
  protein: 50,
  carbs: 275,
  fiber: 28,
  fat: 78,
};

export const macroGoalsAtom = createSettingsFieldAtom(
  "macroGoals",
  DEFAULT_FDA_MACRO_GOALS,
);

export const showNutritionLabelAtom = createSettingsFieldAtom(
  "showNutritionLabel",
  false,
);

export const useNutritionGoalsForLabelAtom = createSettingsFieldAtom(
  "useNutritionGoalsForLabel",
  false,
);

export const foodLogShowCopyIndividualButtonAtom = createSettingsFieldAtom(
  "foodLogShowCopyIndividualButton",
  false,
);

export const mapStyleAtom = createSettingsFieldAtom("mapStyle", "white");

export const increasedTileLimitsAtom = createSettingsFieldAtom(
  "increasedTileLimits",
  false,
);

export const clockHourCycleAtom =
  createOptionalSettingsFieldAtom<Intl.DateTimeFormatOptions["hourCycle"]>(
    "clockHourCycle",
  );

export const dateFormatPatternAtom =
  createOptionalSettingsFieldAtom<string>("dateFormatPattern");

export const dateFormatAtomEffect = atomEffect((get) => {
  const hourCycleOrPromise = get(clockHourCycleAtom);

  if (isPromise(hourCycleOrPromise)) {
    void hourCycleOrPromise.then((hourCycle) => {
      setDateFormatLocale(undefined, hourCycle);
    });
    return;
  }

  setDateFormatLocale(undefined, hourCycleOrPromise);
});

export const numberFormatPatternAtom =
  createOptionalSettingsFieldAtom<string>("numberFormatPattern");

export const numberFormatAtomEffect = atomEffect((get) => {
  const patternOrPromise = get(numberFormatPatternAtom);

  if (isPromise(patternOrPromise)) {
    void patternOrPromise.then((pattern) => {
      const locale = pattern ? PATTERN_TO_LOCALE[pattern] : undefined;
      setNumberFormatLocale(locale);
    });
    return;
  }

  const locale = patternOrPromise
    ? PATTERN_TO_LOCALE[patternOrPromise]
    : undefined;
  setNumberFormatLocale(locale);
});
