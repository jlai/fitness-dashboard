import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import {NutritionMacroGoals} from "@/api/nutrition";

export const weightUnitAtom = atomWithStorage<
  "en_US" | "en_GB" | "METRIC" | undefined
>("unit:weight", undefined, undefined, {
  getOnInit: true,
});

export const waterUnitAtom = atomWithStorage<"en_US" | "METRIC" | undefined>(
  "unit:water",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const distanceUnitAtom = atomWithStorage<"en_US" | "METRIC" | undefined>(
  "unit:distance",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const swimUnitAtom = atomWithStorage<"en_US" | "METRIC" | undefined>(
  "unit:swim",
  undefined,
  undefined,
  {
    getOnInit: true,
  }
);

export const temperatureUnitAtom = atomWithStorage<
  "en_US" | "METRIC" | undefined
>("unit:temperature", undefined, undefined, {
  getOnInit: true,
});

export const allUnitsConfiguredAtom = atom(
  (get) => get(weightUnitAtom) && get(waterUnitAtom) && get(distanceUnitAtom)
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

const DEFAULT_FDA_MACRO_GOALS: NutritionMacroGoals = {
  calories: 2000,
  sodium: 2300,
  protein: 50,
  carbs: 275,
  fiber: 28,
  fat: 78
};

export const macroGoalsAtom = atomWithStorage<NutritionMacroGoals>(
  "nutrition-goals:macros",
  DEFAULT_FDA_MACRO_GOALS,
  undefined,
  {getOnInit: true}
);

export const useNutritionGoalsForLabelAtom = atomWithStorage<boolean>(
  "macro-goals:use-for-label",
  false,
  undefined,
  {
    getOnInit: true,
  }
);

export const foodLogShowCopyIndividualButtonAtom = atomWithStorage<boolean>(
  "food-log:show-copy-individual-button",
  false,
  undefined,
  {
    getOnInit: true,
  }
);

export const mapStyleAtom = atomWithStorage<string>(
  "map:style",
  "white",
  undefined,
  {
    getOnInit: true,
  }
);

export const enableAdvancedScopesAtom = atomWithStorage<boolean>(
  "auth:advanced-scopes",
  false,
  undefined,
  {
    getOnInit: true,
  }
);

export const increasedTileLimitsAtom = atomWithStorage<boolean>(
  "dashboard:increased-tile-limits",
  false,
  undefined,
  {
    getOnInit: true,
  }
);
