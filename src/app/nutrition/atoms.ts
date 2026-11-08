import Immutable from "immutable";
import { atom } from "jotai";

import { NutritionLogDataPoint } from "@/api/nutrition";

export const selectedFoodLogsAtom = atom<Immutable.Set<NutritionLogDataPoint>>(
  Immutable.Set([]),
);

export const updateSelectedFoodLogAtom = atom(
  null,
  (get, set, foodLog: NutritionLogDataPoint, shouldInclude: boolean) => {
    const foodLogs = get(selectedFoodLogsAtom);
    set(
      selectedFoodLogsAtom,
      shouldInclude ? foodLogs.add(foodLog) : foodLogs.remove(foodLog),
    );
  },
);
