import { atom, useAtomValue } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { getUserProfileQuery } from "./user";

const MILES_PER_KM = 0.621371;
const FLUID_OZ_PER_ML = 0.033814;
const CUP_PER_ML = FLUID_OZ_PER_ML / 8;

export const unitsAtom = atom(async (get) => {
  const queryClient = get(queryClientAtom);
  const profile = await queryClient.fetchQuery(getUserProfileQuery());

  const { distanceUnit, waterUnit, waterUnitName } = profile;

  return {
    // distance
    distanceUnit: distanceUnit,
    localizedDistance: (value: number) =>
      localizedDistance(distanceUnit, value),
    localizedDistanceName: localizedDistanceName(distanceUnit),

    waterUnit: waterUnit,
    localizedWaterUnitName: waterUnitName,
    localizedWaterVolume: (value: number) =>
      localizedWaterVolume(waterUnit, waterUnitName, value),
  };
});

export function useUnits() {
  return useAtomValue(unitsAtom);
}

export function kilometersToMiles() {
  return 0.621371;
}

export function localizedDistance(distanceUnit: string, value: number) {
  switch (distanceUnit) {
    case "en_US":
      return value * MILES_PER_KM;
    default:
      return value;
  }
}

export function localizedDistanceName(distanceUnit: string) {
  if (distanceUnit === "en_US") {
    return "miles";
  } else {
    return "km";
  }
}

export function localizedWaterVolume(
  waterUnit: string,
  waterUnitName: string,
  value: number
) {
  switch (waterUnit) {
    case "METRIC":
      return value;
    case "en_US":
      if (waterUnitName === "cup") {
        return value * CUP_PER_ML;
      } else {
        return value * FLUID_OZ_PER_ML;
      }
  }

  throw new Error("unknown water unit");
}
