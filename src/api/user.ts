import { queryOptions } from "@tanstack/react-query";

import {
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
} from "@generated/orval/fetch/google-health-api/models";
import {
  healthUsersGetProfile,
  healthUsersGetSettings,
} from "@generated/orval/fetch/google-health-api/users/users";

import { ONE_DAY_IN_MILLIS } from "./cache-settings";

export {
  SettingsDistanceUnit,
  SettingsSwimUnit,
  SettingsTemperatureUnit,
  SettingsWaterUnit,
  SettingsWeightUnit,
};

export type DistanceUnitSystem = Exclude<
  SettingsDistanceUnit,
  typeof SettingsDistanceUnit.DISTANCE_UNIT_UNSPECIFIED
>;
export type SwimUnitSystem = Exclude<
  SettingsSwimUnit,
  typeof SettingsSwimUnit.SWIM_UNIT_UNSPECIFIED
>;
export type TemperatureUnitSystem = Exclude<
  SettingsTemperatureUnit,
  typeof SettingsTemperatureUnit.TEMPERATURE_UNIT_UNSPECIFIED
>;
export type WaterUnitSystem = Exclude<
  SettingsWaterUnit,
  typeof SettingsWaterUnit.WATER_UNIT_UNSPECIFIED
>;
export type WeightUnitSystem = Exclude<
  SettingsWeightUnit,
  typeof SettingsWeightUnit.WEIGHT_UNIT_UNSPECIFIED
>;

/** Convert a stored or API unit value, including legacy Fitbit locale codes. */
export function parseDistanceUnit(
  value: unknown,
): DistanceUnitSystem | undefined {
  switch (value) {
    case "en_US":
    case SettingsDistanceUnit.DISTANCE_UNIT_MILES:
      return SettingsDistanceUnit.DISTANCE_UNIT_MILES;
    case "METRIC":
    case SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS:
      return SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS;
    default:
      return undefined;
  }
}

/** Convert a stored or API unit value, including legacy Fitbit locale codes. */
export function parseSwimUnit(value: unknown): SwimUnitSystem | undefined {
  switch (value) {
    case "en_US":
    case SettingsSwimUnit.SWIM_UNIT_YARDS:
      return SettingsSwimUnit.SWIM_UNIT_YARDS;
    case "METRIC":
    case SettingsSwimUnit.SWIM_UNIT_METERS:
      return SettingsSwimUnit.SWIM_UNIT_METERS;
    default:
      return undefined;
  }
}

/** Convert a stored or API unit value, including legacy Fitbit locale codes. */
export function parseTemperatureUnit(
  value: unknown,
): TemperatureUnitSystem | undefined {
  switch (value) {
    case "en_US":
    case SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT:
      return SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT;
    case "METRIC":
    case SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS:
      return SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS;
    default:
      return undefined;
  }
}

/** Convert a stored or API unit value, including legacy Fitbit locale codes. */
export function parseWaterUnit(value: unknown): WaterUnitSystem | undefined {
  switch (value) {
    case "en_US":
    case SettingsWaterUnit.WATER_UNIT_FL_OZ:
      return SettingsWaterUnit.WATER_UNIT_FL_OZ;
    case "METRIC":
    case SettingsWaterUnit.WATER_UNIT_ML:
      return SettingsWaterUnit.WATER_UNIT_ML;
    case SettingsWaterUnit.WATER_UNIT_CUP:
      return SettingsWaterUnit.WATER_UNIT_CUP;
    default:
      return undefined;
  }
}

/** Convert a stored or API unit value, including legacy Fitbit locale codes. */
export function parseWeightUnit(value: unknown): WeightUnitSystem | undefined {
  switch (value) {
    case "en_US":
    case SettingsWeightUnit.WEIGHT_UNIT_POUNDS:
      return SettingsWeightUnit.WEIGHT_UNIT_POUNDS;
    case "en_GB":
    case SettingsWeightUnit.WEIGHT_UNIT_STONE:
      return SettingsWeightUnit.WEIGHT_UNIT_STONE;
    case "METRIC":
    case SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS:
      return SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS;
    default:
      return undefined;
  }
}

export function buildUserSettingsQuery() {
  return queryOptions({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const response = await healthUsersGetSettings("me");
      return response.data;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}

export function buildHealthProfileQuery() {
  return queryOptions({
    queryKey: ["health-profile"],
    queryFn: async () => {
      const response = await healthUsersGetProfile("me");
      return response.data;
    },
    staleTime: ONE_DAY_IN_MILLIS,
  });
}
