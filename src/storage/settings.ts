import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

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
