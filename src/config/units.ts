import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";

import {
  distanceUnitAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterUnitAtom,
  weightUnitAtom,
} from "@/storage/settings";
import {
  buildUserProfileQuery,
  DistanceUnitSystem,
  SwimUnitSystem,
  TemperatureUnitSystem,
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";
import { hasTokenScope } from "@/api/auth";

export const MILES_PER_KM = 0.621371;
const FEET_PER_METER = 3.28084;
const YARDS_PER_METER = 1.09361;
const FLUID_OZ_PER_ML = 0.033814;
// const CUP_PER_ML = FLUID_OZ_PER_ML / 8;
const POUNDS_PER_KG = 2.20462;
const STONES_PER_KG = 0.157473;
const DEGREES_F_PER_C = 1.8;

interface DistanceUnitConfig {
  distanceUnit: DistanceUnitSystem;
  localizedMeters: (value: number) => number;
  localizedKilometers: (value: number) => number;
  localizedMetersName: string;
  localizedKilometersName: string;
  localizedKilometersNameLong: string;
}

interface SwimUnitConfig {
  swimUnit: SwimUnitSystem;
  localizedSwimMeters: (value: number) => number;
  localizedSwimMetersName: string;
}

interface TemperatureUnitConfig {
  temperatureUnit: TemperatureUnitSystem;
  localizedDegreesCelsius: (value: number) => number;
  localizedDegreesName: string;
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
  localizedKilometersNameLong: "miles",
};

const METRIC_DISTANCE_UNIT_CONFIG: DistanceUnitConfig = {
  distanceUnit: "METRIC",
  localizedMeters: (value: number) => value,
  localizedKilometers: (value: number) => value,
  localizedMetersName: "m",
  localizedKilometersName: "km",
  localizedKilometersNameLong: "kilometers",
};

const US_SWIM_UNIT_CONFIG: SwimUnitConfig = {
  swimUnit: "en_US",
  localizedSwimMeters: (value: number) => value * YARDS_PER_METER,
  localizedSwimMetersName: "yds",
};

const METRIC_SWIM_UNIT_CONFIG: SwimUnitConfig = {
  swimUnit: "METRIC",
  localizedSwimMeters: (value: number) => value,
  localizedSwimMetersName: "m",
};

const US_TEMPERATURE_UNIT_CONFIG: TemperatureUnitConfig = {
  temperatureUnit: "en_US",
  localizedDegreesCelsius: (value: number) => value * DEGREES_F_PER_C,
  localizedDegreesName: "\u00B0F",
};

const METRIC_TEMPERATURE_UNIT_CONFIG: TemperatureUnitConfig = {
  temperatureUnit: "METRIC",
  localizedDegreesCelsius: (value: number) => value,
  localizedDegreesName: "\u00B0C",
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
  localizedKilograms: (value: number) => value,
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
  const [storedSwimUnitSystem, setSwimUnitSystem] = useAtom(swimUnitAtom);
  const [storedTemperatureUnitSystem, setTemperatureUnitSystem] =
    useAtom(temperatureUnitAtom);
  const [storedWeightUnitSystem, setWeightUnitSystem] = useAtom(weightUnitAtom);
  const [storedWaterUnitSystem, setWaterUnitSystem] = useAtom(waterUnitAtom);

  const queryClient = useQueryClient();

  // NOTE: this will only run once due to caching
  const { data: profileUnits } = useSuspenseQuery({
    queryKey: ["units"],
    queryFn: async () => {
      let distanceUnitSystem = storedDistanceUnitSystem;
      let swimUnitSystem = storedSwimUnitSystem;
      let temperatureUnitSystem = storedTemperatureUnitSystem;

      let weightUnitSystem = storedWeightUnitSystem;
      let waterUnitSystem = storedWaterUnitSystem;

      if (
        !distanceUnitSystem ||
        !swimUnitSystem ||
        !weightUnitSystem ||
        !waterUnitSystem ||
        !temperatureUnitSystem
      ) {
        if (!hasTokenScope("pro")) {
          return {
            distanceUnitSystem: "METRIC",
            weightUnitSystem: "METRIC",
            waterUnitSystem: "METRIC",
            temperatureUnitSystem: "METRIC",
          };
        }

        const profile = await queryClient.fetchQuery(buildUserProfileQuery());

        if (!distanceUnitSystem) {
          distanceUnitSystem = profile.distanceUnit;
          setDistanceUnitSystem(profile.distanceUnit);
        }

        if (!swimUnitSystem) {
          swimUnitSystem = profile.swimUnit;
          setSwimUnitSystem(swimUnitSystem);
        }

        if (!temperatureUnitSystem) {
          temperatureUnitSystem = profile.temperatureUnit;
          setTemperatureUnitSystem(temperatureUnitSystem);
        }

        if (!weightUnitSystem) {
          weightUnitSystem = profile.weightUnit;
          setWeightUnitSystem(weightUnitSystem);
        }

        if (!waterUnitSystem) {
          waterUnitSystem = profile.waterUnit;
          setWaterUnitSystem(waterUnitSystem);
        }
      }

      return {
        distanceUnitSystem,
        swimUnitSystem,
        temperatureUnitSystem,
        weightUnitSystem,
        waterUnitSystem,
      };
    },
  });

  const distanceUnitConfig =
    (storedDistanceUnitSystem ?? profileUnits.distanceUnitSystem) === "en_US"
      ? US_DISTANCE_UNIT_CONFIG
      : METRIC_DISTANCE_UNIT_CONFIG;

  const swimUnitConfig =
    (storedSwimUnitSystem ?? profileUnits.swimUnitSystem) === "en_US"
      ? US_SWIM_UNIT_CONFIG
      : METRIC_SWIM_UNIT_CONFIG;

  const temperatureUnitConfig =
    (storedTemperatureUnitSystem ?? profileUnits.temperatureUnitSystem) ===
    "en_US"
      ? US_TEMPERATURE_UNIT_CONFIG
      : METRIC_TEMPERATURE_UNIT_CONFIG;

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

  return {
    ...distanceUnitConfig,
    ...swimUnitConfig,
    ...temperatureUnitConfig,
    ...weightUnitConfig,
    ...waterUnitConfig,
  };
}
