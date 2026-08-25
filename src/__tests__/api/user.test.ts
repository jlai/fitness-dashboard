import {
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
} from "@/api/user";

describe("parse unit values", () => {
  it("converts legacy Fitbit locale codes to Settings enums", () => {
    expect(parseDistanceUnit("en_US")).toBe(
      SettingsDistanceUnit.DISTANCE_UNIT_MILES,
    );
    expect(parseDistanceUnit("METRIC")).toBe(
      SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS,
    );
    expect(parseSwimUnit("en_US")).toBe(SettingsSwimUnit.SWIM_UNIT_YARDS);
    expect(parseSwimUnit("METRIC")).toBe(SettingsSwimUnit.SWIM_UNIT_METERS);
    expect(parseTemperatureUnit("en_US")).toBe(
      SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT,
    );
    expect(parseTemperatureUnit("METRIC")).toBe(
      SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS,
    );
    expect(parseWaterUnit("en_US")).toBe(SettingsWaterUnit.WATER_UNIT_FL_OZ);
    expect(parseWaterUnit("METRIC")).toBe(SettingsWaterUnit.WATER_UNIT_ML);
    expect(parseWeightUnit("en_US")).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_POUNDS,
    );
    expect(parseWeightUnit("en_GB")).toBe(SettingsWeightUnit.WEIGHT_UNIT_STONE);
    expect(parseWeightUnit("METRIC")).toBe(
      SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS,
    );
  });

  it("keeps Settings enum values and drops unspecified", () => {
    expect(parseDistanceUnit(SettingsDistanceUnit.DISTANCE_UNIT_MILES)).toBe(
      SettingsDistanceUnit.DISTANCE_UNIT_MILES,
    );
    expect(
      parseDistanceUnit(SettingsDistanceUnit.DISTANCE_UNIT_UNSPECIFIED),
    ).toBeUndefined();
    expect(parseWaterUnit(SettingsWaterUnit.WATER_UNIT_CUP)).toBe(
      SettingsWaterUnit.WATER_UNIT_CUP,
    );
  });
});
