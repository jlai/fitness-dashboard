import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { atomEffect } from "jotai-effect";

import { NutritionMacroGoals } from "@/api/nutrition";
import {
  DistanceUnitSystem,
  parseDistanceUnit,
  parseSwimUnit,
  parseTemperatureUnit,
  parseWaterUnit,
  parseWeightUnit,
  SwimUnitSystem,
  TemperatureUnitSystem,
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";
import {
  PATTERN_TO_LOCALE,
  setNumberFormatLocale,
} from "@/utils/number-formats";
import { setDateFormatLocale } from "@/utils/date-formats";

/**
 * Reads canonical unit values from `units:*`. If missing, copies from the
 * legacy `unit:*` key (Fitbit locale codes or already-migrated enums), writes
 * the canonical value to `units:*`, and removes the old key.
 */
function createMigratingUnitStorage<T>(
  migrate: (value: unknown) => T | undefined,
) {
  const storage = createJSONStorage<T | undefined>();

  return {
    ...storage,
    getItem(key: string, initialValue: T | undefined) {
      try {
        if (localStorage.getItem(key) !== null) {
          return storage.getItem(key, initialValue);
        }

        const legacyKey = key.replace(/^units:/, "unit:");
        if (legacyKey === key) {
          return initialValue;
        }

        const legacyStored = localStorage.getItem(legacyKey);
        if (legacyStored === null) {
          return initialValue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(legacyStored);
        } catch {
          parsed = legacyStored;
        }

        const migrated = migrate(parsed);
        localStorage.removeItem(legacyKey);

        if (migrated === undefined) {
          return initialValue;
        }

        localStorage.setItem(key, JSON.stringify(migrated));
        return migrated;
      } catch {
        return initialValue;
      }
    },
  };
}

export const weightUnitAtom = atomWithStorage<WeightUnitSystem | undefined>(
  "units:weight",
  undefined,
  createMigratingUnitStorage(parseWeightUnit),
  {
    getOnInit: true,
  },
);

export const waterUnitAtom = atomWithStorage<WaterUnitSystem | undefined>(
  "units:water",
  undefined,
  createMigratingUnitStorage(parseWaterUnit),
  {
    getOnInit: true,
  },
);

export const distanceUnitAtom = atomWithStorage<DistanceUnitSystem | undefined>(
  "units:distance",
  undefined,
  createMigratingUnitStorage(parseDistanceUnit),
  {
    getOnInit: true,
  },
);

export const swimUnitAtom = atomWithStorage<SwimUnitSystem | undefined>(
  "units:swim",
  undefined,
  createMigratingUnitStorage(parseSwimUnit),
  {
    getOnInit: true,
  },
);

export const temperatureUnitAtom = atomWithStorage<
  TemperatureUnitSystem | undefined
>(
  "units:temperature",
  undefined,
  createMigratingUnitStorage(parseTemperatureUnit),
  {
    getOnInit: true,
  },
);

export const allUnitsConfiguredAtom = atom(
  (get) => get(weightUnitAtom) && get(waterUnitAtom) && get(distanceUnitAtom),
);

export const foodLogTotalsPositionAtom = atomWithStorage<
  "top" | "bottom" | "both"
>("food-log:totals-position", "bottom", undefined, {
  getOnInit: true,
});

export const foodLogGoalsPositionAtom = atomWithStorage<
  "hidden" | "top" | "bottom" | "both"
>("macro-goals:position", "hidden", undefined, {
  getOnInit: true,
});

export const DEFAULT_FDA_MACRO_GOALS: NutritionMacroGoals = {
  calories: 2000,
  sodium: 2300,
  protein: 50,
  carbs: 275,
  fiber: 28,
  fat: 78,
};

export const macroGoalsAtom = atomWithStorage<NutritionMacroGoals>(
  "nutrition-goals:macros",
  DEFAULT_FDA_MACRO_GOALS,
  undefined,
  { getOnInit: true },
);

export const showNutritionLabelAtom = atomWithStorage<boolean>(
  "nutrition-facts:show-label",
  false,
  undefined,
  {
    getOnInit: true,
  },
);

export const useNutritionGoalsForLabelAtom = atomWithStorage<boolean>(
  "macro-goals:use-for-label",
  false,
  undefined,
  {
    getOnInit: true,
  },
);

export const foodLogShowCopyIndividualButtonAtom = atomWithStorage<boolean>(
  "food-log:show-copy-individual-button",
  false,
  undefined,
  {
    getOnInit: true,
  },
);

export const mapStyleAtom = atomWithStorage<string>(
  "map:style",
  "white",
  undefined,
  {
    getOnInit: true,
  },
);

export const enableAdvancedScopesAtom = atomWithStorage<boolean>(
  "auth:advanced-scopes",
  false,
  undefined,
  {
    getOnInit: true,
  },
);

export const increasedTileLimitsAtom = atomWithStorage<boolean>(
  "dashboard:increased-tile-limits",
  false,
  undefined,
  {
    getOnInit: true,
  },
);

export const clockHourCycleAtom = atomWithStorage<
  Intl.DateTimeFormatOptions["hourCycle"]
>("locale:clock-hour-cycle", undefined, undefined, {
  getOnInit: true,
});

export const dateFormatPatternAtom = atomWithStorage<string | undefined>(
  "locale:date-format-pattern",
  undefined,
  undefined,
  {
    getOnInit: true,
  },
);

export const dateFormatAtomEffect = atomEffect((get) => {
  const hourCycle = get(clockHourCycleAtom);

  setDateFormatLocale(undefined, hourCycle);
});

export const numberFormatPatternAtom = atomWithStorage<string | undefined>(
  "locale:number-format-pattern",
  undefined,
  undefined,
  {
    getOnInit: true,
  },
);

export const numberFormatAtomEffect = atomEffect((get) => {
  const pattern = get(numberFormatPatternAtom);
  const locale = pattern ? PATTERN_TO_LOCALE[pattern] : undefined;

  setNumberFormatLocale(locale);
});
