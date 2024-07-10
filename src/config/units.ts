import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

import {
  distanceUnitAtom,
  waterUnitAtom,
  weightUnitAtom,
} from "@/storage/settings";
import {
  buildUserProfileQuery,
  DistanceUnitSystem,
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";
import { hasTokenScope } from "@/api/auth";

const MILES_PER_KM = 0.621371;
const FEET_PER_METER = 3.28084;
const FLUID_OZ_PER_ML = 0.033814;
// const CUP_PER_ML = FLUID_OZ_PER_ML / 8;
const POUNDS_PER_KG = 2.20462;
const STONES_PER_KG = 0.157473;

interface DistanceUnitConfig {
  distanceUnit: DistanceUnitSystem;
  localizedMeters: (value: number) => number;
  localizedKilometers: (value: number) => number;
  localizedMetersName: string;
  localizedKilometersName: string;
}

interface WeightUnitConfig {
  weightUnit: WeightUnitSystem;
  localizedKilograms: (value: number) => number;
  localizedKilogramsName: string;
}

interface WaterUnitConfig {
  waterUnit: WaterUnitSystem;
  localizedWaterVolumeName: string;
  localizedWaterVolume: (value: number) => number;
}

const US_DISTANCE_UNIT_CONFIG: DistanceUnitConfig = {
  distanceUnit: "en_US",
  localizedMeters: (value: number) => value * FEET_PER_METER,
  localizedKilometers: (value: number) => value * MILES_PER_KM,
  localizedMetersName: "ft",
  localizedKilometersName: "mi",
};

const METRIC_DISTANCE_UNIT_CONFIG: DistanceUnitConfig = {
  distanceUnit: "METRIC",
  localizedMeters: (value: number) => value,
  localizedKilometers: (value: number) => value,
  localizedMetersName: "m",
  localizedKilometersName: "km",
};

const US_WEIGHT_UNIT_CONFIG: WeightUnitConfig = {
  weightUnit: "en_US",
  localizedKilograms: (value: number) => value * POUNDS_PER_KG,
  localizedKilogramsName: "lbs",
};

const GB_WEIGHT_UNIT_CONFIG: WeightUnitConfig = {
  weightUnit: "en_GB",
  localizedKilograms: (value: number) => value * STONES_PER_KG,
  localizedKilogramsName: "st",
};

const METRIC_WEIGHT_UNIT_CONFIG: WeightUnitConfig = {
  weightUnit: "METRIC",
  localizedKilograms: (value: number) => value * POUNDS_PER_KG,
  localizedKilogramsName: "kg",
};

const US_WATER_UNIT_CONFIG: WaterUnitConfig = {
  waterUnit: "en_US",
  localizedWaterVolumeName: "fl oz",
  localizedWaterVolume: (value: number) => value * FLUID_OZ_PER_ML,
};

const METRIC_WATER_UNIT_CONFIG: WaterUnitConfig = {
  waterUnit: "METRIC",
  localizedWaterVolumeName: "ml",
  localizedWaterVolume: (value: number) => value,
};

export function useUnits() {
  const [storedDistanceUnitSystem, setDistanceUnitSystem] =
    useAtom(distanceUnitAtom);
  const [storedWeightUnitSystem, setWeightUnitSystem] = useAtom(weightUnitAtom);
  const [storedWaterUnitSystem, setWaterUnitSystem] = useAtom(waterUnitAtom);

  const queryClient = useQueryClient();

  // NOTE: this will only run once due to caching
  const { data: profileUnits } = useSuspenseQuery({
    queryKey: ["units"],
    queryFn: async () => {
      let distanceUnitSystem = storedDistanceUnitSystem;
      let weightUnitSystem = storedWeightUnitSystem;
      let waterUnitSystem = storedWaterUnitSystem;

      if (!distanceUnitSystem || !weightUnitSystem || !waterUnitSystem) {
        if (!hasTokenScope("pro")) {
          return {
            distanceUnitSystem: "METRIC",
            weightUnitSystem: "METRIC",
            waterUnitSystem: "METRIC",
          };
        }

        const profile = await queryClient.fetchQuery(buildUserProfileQuery());

        if (!distanceUnitSystem) {
          distanceUnitSystem = profile.distanceUnit;
          setDistanceUnitSystem(profile.distanceUnit);
        }

        if (!weightUnitSystem) {
          weightUnitSystem = profile.weightUnit;
          setWeightUnitSystem(profile.weightUnit);
        }

        if (!waterUnitSystem) {
          waterUnitSystem = profile.waterUnit;
          setWaterUnitSystem(profile.waterUnit);
        }
      }

      return { distanceUnitSystem, weightUnitSystem, waterUnitSystem };
    },
  });

  const distanceUnitConfig =
    (storedDistanceUnitSystem ?? profileUnits.distanceUnitSystem) === "en_US"
      ? US_DISTANCE_UNIT_CONFIG
      : METRIC_DISTANCE_UNIT_CONFIG;

  let weightUnitConfig: WeightUnitConfig;

  switch (storedWeightUnitSystem ?? profileUnits.weightUnitSystem) {
    case "en_US":
      weightUnitConfig = US_WEIGHT_UNIT_CONFIG;
      break;
    case "en_GB":
      weightUnitConfig = GB_WEIGHT_UNIT_CONFIG;
      break;
    default:
      weightUnitConfig = METRIC_WEIGHT_UNIT_CONFIG;
      break;
  }

  const waterUnitConfig =
    (storedWaterUnitSystem ?? profileUnits.waterUnitSystem) === "en_US"
      ? US_WATER_UNIT_CONFIG
      : METRIC_WATER_UNIT_CONFIG;

  return { ...distanceUnitConfig, ...weightUnitConfig, ...waterUnitConfig };
}
