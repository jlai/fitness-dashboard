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
  buildUserSettingsQuery,
  DistanceUnitSystem,
  parseDistanceUnit,
  parseSwimUnit,
  parseTemperatureUnit,
  parseWaterUnit,
  parseWeightUnit,
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
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
const CUP_PER_ML = FLUID_OZ_PER_ML / 8;
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
  distanceUnit: SettingsDistanceUnit.DISTANCE_UNIT_MILES,
  localizedMeters: (value: number) => value * FEET_PER_METER,
  localizedKilometers: (value: number) => value * MILES_PER_KM,
  localizedMetersName: "ft",
  localizedKilometersName: "mi",
  localizedKilometersNameLong: "miles",
};

const METRIC_DISTANCE_UNIT_CONFIG: DistanceUnitConfig = {
  distanceUnit: SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS,
  localizedMeters: (value: number) => value,
  localizedKilometers: (value: number) => value,
  localizedMetersName: "m",
  localizedKilometersName: "km",
  localizedKilometersNameLong: "kilometers",
};

const US_SWIM_UNIT_CONFIG: SwimUnitConfig = {
  swimUnit: SettingsSwimUnit.SWIM_UNIT_YARDS,
  localizedSwimMeters: (value: number) => value * YARDS_PER_METER,
  localizedSwimMetersName: "yds",
};

const METRIC_SWIM_UNIT_CONFIG: SwimUnitConfig = {
  swimUnit: SettingsSwimUnit.SWIM_UNIT_METERS,
  localizedSwimMeters: (value: number) => value,
  localizedSwimMetersName: "m",
};

const US_TEMPERATURE_UNIT_CONFIG: TemperatureUnitConfig = {
  temperatureUnit: SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT,
  localizedDegreesCelsius: (value: number) => value * DEGREES_F_PER_C,
  localizedDegreesName: "\u00B0F",
};

const METRIC_TEMPERATURE_UNIT_CONFIG: TemperatureUnitConfig = {
  temperatureUnit: SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS,
  localizedDegreesCelsius: (value: number) => value,
  localizedDegreesName: "\u00B0C",
};

const US_WEIGHT_UNIT_CONFIG: WeightUnitConfig = {
  weightUnit: SettingsWeightUnit.WEIGHT_UNIT_POUNDS,
  localizedKilograms: (value: number) => value * POUNDS_PER_KG,
  localizedKilogramsName: "lbs",
};

const GB_WEIGHT_UNIT_CONFIG: WeightUnitConfig = {
  weightUnit: SettingsWeightUnit.WEIGHT_UNIT_STONE,
  localizedKilograms: (value: number) => value * STONES_PER_KG,
  localizedKilogramsName: "st",
};

const METRIC_WEIGHT_UNIT_CONFIG: WeightUnitConfig = {
  weightUnit: SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
  localizedKilograms: (value: number) => value,
  localizedKilogramsName: "kg",
};

const US_WATER_UNIT_CONFIG: WaterUnitConfig = {
  waterUnit: SettingsWaterUnit.WATER_UNIT_FL_OZ,
  localizedWaterVolumeName: "fl oz",
  localizedWaterVolume: (value: number) => value * FLUID_OZ_PER_ML,
};

const CUP_WATER_UNIT_CONFIG: WaterUnitConfig = {
  waterUnit: SettingsWaterUnit.WATER_UNIT_CUP,
  localizedWaterVolumeName: "cup",
  localizedWaterVolume: (value: number) => value * CUP_PER_ML,
};

const METRIC_WATER_UNIT_CONFIG: WaterUnitConfig = {
  waterUnit: SettingsWaterUnit.WATER_UNIT_ML,
  localizedWaterVolumeName: "ml",
  localizedWaterVolume: (value: number) => value,
};

const DEFAULT_UNITS = {
  distanceUnitSystem: SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS,
  swimUnitSystem: SettingsSwimUnit.SWIM_UNIT_METERS,
  temperatureUnitSystem: SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS,
  weightUnitSystem: SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
  waterUnitSystem: SettingsWaterUnit.WATER_UNIT_ML,
} as const;

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
  const { data: settingsUnits } = useSuspenseQuery({
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
        if (!hasTokenScope("set")) {
          return {
            distanceUnitSystem:
              distanceUnitSystem ?? DEFAULT_UNITS.distanceUnitSystem,
            swimUnitSystem: swimUnitSystem ?? DEFAULT_UNITS.swimUnitSystem,
            temperatureUnitSystem:
              temperatureUnitSystem ?? DEFAULT_UNITS.temperatureUnitSystem,
            weightUnitSystem:
              weightUnitSystem ?? DEFAULT_UNITS.weightUnitSystem,
            waterUnitSystem: waterUnitSystem ?? DEFAULT_UNITS.waterUnitSystem,
          };
        }

        const settings = await queryClient.fetchQuery(buildUserSettingsQuery());

        if (!distanceUnitSystem) {
          distanceUnitSystem = parseDistanceUnit(settings.distanceUnit);
          if (distanceUnitSystem) {
            setDistanceUnitSystem(distanceUnitSystem);
          }
        }

        if (!swimUnitSystem) {
          swimUnitSystem = parseSwimUnit(settings.swimUnit);
          if (swimUnitSystem) {
            setSwimUnitSystem(swimUnitSystem);
          }
        }

        if (!temperatureUnitSystem) {
          temperatureUnitSystem = parseTemperatureUnit(
            settings.temperatureUnit,
          );
          if (temperatureUnitSystem) {
            setTemperatureUnitSystem(temperatureUnitSystem);
          }
        }

        if (!weightUnitSystem) {
          weightUnitSystem = parseWeightUnit(settings.weightUnit);
          if (weightUnitSystem) {
            setWeightUnitSystem(weightUnitSystem);
          }
        }

        if (!waterUnitSystem) {
          waterUnitSystem = parseWaterUnit(settings.waterUnit);
          if (waterUnitSystem) {
            setWaterUnitSystem(waterUnitSystem);
          }
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
    (storedDistanceUnitSystem ?? settingsUnits.distanceUnitSystem) ===
    SettingsDistanceUnit.DISTANCE_UNIT_MILES
      ? US_DISTANCE_UNIT_CONFIG
      : METRIC_DISTANCE_UNIT_CONFIG;

  const swimUnitConfig =
    (storedSwimUnitSystem ?? settingsUnits.swimUnitSystem) ===
    SettingsSwimUnit.SWIM_UNIT_YARDS
      ? US_SWIM_UNIT_CONFIG
      : METRIC_SWIM_UNIT_CONFIG;

  const temperatureUnitConfig =
    (storedTemperatureUnitSystem ?? settingsUnits.temperatureUnitSystem) ===
    SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT
      ? US_TEMPERATURE_UNIT_CONFIG
      : METRIC_TEMPERATURE_UNIT_CONFIG;

  let weightUnitConfig: WeightUnitConfig;

  switch (storedWeightUnitSystem ?? settingsUnits.weightUnitSystem) {
    case SettingsWeightUnit.WEIGHT_UNIT_POUNDS:
      weightUnitConfig = US_WEIGHT_UNIT_CONFIG;
      break;
    case SettingsWeightUnit.WEIGHT_UNIT_STONE:
      weightUnitConfig = GB_WEIGHT_UNIT_CONFIG;
      break;
    default:
      weightUnitConfig = METRIC_WEIGHT_UNIT_CONFIG;
      break;
  }

  let waterUnitConfig: WaterUnitConfig;

  switch (storedWaterUnitSystem ?? settingsUnits.waterUnitSystem) {
    case SettingsWaterUnit.WATER_UNIT_FL_OZ:
      waterUnitConfig = US_WATER_UNIT_CONFIG;
      break;
    case SettingsWaterUnit.WATER_UNIT_CUP:
      waterUnitConfig = CUP_WATER_UNIT_CONFIG;
      break;
    default:
      waterUnitConfig = METRIC_WATER_UNIT_CONFIG;
      break;
  }

  return {
    ...distanceUnitConfig,
    ...swimUnitConfig,
    ...temperatureUnitConfig,
    ...weightUnitConfig,
    ...waterUnitConfig,
  };
}

export function millimetersToKilometers(millimeters: number) {
  return millimeters / 1_000_000;
}
