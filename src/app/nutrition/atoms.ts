import Immutable from "immutable";
import { atom } from "jotai";

import { FoodLogEntry } from "@/api/nutrition";

export const moveDialogOpenAtom = atom(false);
export const selectedFoodLogsAtom = atom<Immutable.Set<FoodLogEntry>>(
  Immutable.Set([])
);

export const updateSelectedFoodLogAtom = atom(
  null,
  (get, set, foodLog: FoodLogEntry, shouldInclude: boolean) => {
    const foodLogs = get(selectedFoodLogsAtom);
    set(
      selectedFoodLogsAtom,
      shouldInclude ? foodLogs.add(foodLog) : foodLogs.remove(foodLog)
    );
  }
);
