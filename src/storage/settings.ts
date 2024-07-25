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

export const allUnitsConfiguredAtom = atom(
  (get) => get(weightUnitAtom) && get(waterUnitAtom) && get(distanceUnitAtom)
);

export const foodLogTotalsPositionAtom = atomWithStorage<
  "top" | "bottom" | "both"
>("food-log:totals-position", "bottom", undefined, {
  getOnInit: true,
});
