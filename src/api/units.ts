import { atom, useAtomValue } from "jotai";
import { queryClientAtom } from "jotai-tanstack-query";

import { buildUserProfileQuery } from "./user";

const MILES_PER_KM = 0.621371;
const FEET_PER_METER = 3.28084;
const FLUID_OZ_PER_ML = 0.033814;
const CUP_PER_ML = FLUID_OZ_PER_ML / 8;
const POUNDS_PER_KG = 2.20462;

export const unitsAtom = atom(async (get) => {
  const queryClient = get(queryClientAtom);
  const profile = await queryClient.fetchQuery(buildUserProfileQuery());

  const {
    distanceUnit: distanceUnitSystem,
    waterUnit,
    waterUnitName,
  } = profile;

  return {
    // distance
    distanceUnit: distanceUnitSystem,
    localizedMeters: (value: number) =>
      distanceUnitSystem === "en_US" ? value * FEET_PER_METER : value,
    localizedKilometers: (value: number) =>
      distanceUnitSystem === "en_US" ? value * MILES_PER_KM : value,

    localizedMetersName: distanceUnitSystem === "en_US" ? "ft" : "m",
    localizedKilometersName: distanceUnitSystem === "en_US" ? "mi" : "km",

    // weight
    localizedKilograms: (value: number) =>
      distanceUnitSystem === "en_US" ? value * POUNDS_PER_KG : value,
    localizedKilogramName: distanceUnitSystem === "en_US" ? "lbs" : "kg",

    // water
    waterUnit: waterUnit,
    localizedWaterUnitName: waterUnitName,
    localizedWaterVolume: (value: number) =>
      localizedWaterVolume(waterUnit, waterUnitName, value),
  };
});

export function useUnits() {
  return useAtomValue(unitsAtom);
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
