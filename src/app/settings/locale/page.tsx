"use client";

import { MenuItem, Select } from "@mui/material";
import { useAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";

import {
  DistanceUnitSystem,
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
import {
  clockHourCycleAtom,
  dateFormatPatternAtom,
  distanceUnitAtom,
  numberFormatPatternAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterUnitAtom,
  weightUnitAtom,
} from "@/storage/settings";
import { PATTERN_TO_LOCALE } from "@/utils/number-formats";

import { SettingsRow, SettingsTable } from "../common";

function UnitSettings() {
  const [distanceUnit, setDistanceUnit] = useAtom(distanceUnitAtom);
  const [swimUnit, setSwimUnit] = useAtom(swimUnitAtom);
  const [temperatureUnit, setTemperatureUnit] = useAtom(temperatureUnitAtom);

  const [weightUnit, setWeightUnit] = useAtom(weightUnitAtom);
  const [waterUnit, setWaterUnit] = useAtom(waterUnitAtom);

  return (
    <>
      <SettingsRow title="Unit settings">
        This will not affect your Google Health account, only the units used on
        this website.
      </SettingsRow>
      <SettingsRow
        title="Distance unit"
        action={
          <Select<DistanceUnitSystem>
            value={distanceUnit}
            onChange={(event) => setDistanceUnit(event.target.value as any)}
          >
            <MenuItem value={SettingsDistanceUnit.DISTANCE_UNIT_MILES}>
              Miles
            </MenuItem>
            <MenuItem value={SettingsDistanceUnit.DISTANCE_UNIT_KILOMETERS}>
              Kilometers
            </MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Swim distance unit"
        action={
          <Select<SwimUnitSystem>
            value={swimUnit}
            onChange={(event) => setSwimUnit(event.target.value as any)}
          >
            <MenuItem value={SettingsSwimUnit.SWIM_UNIT_YARDS}>Yards</MenuItem>
            <MenuItem value={SettingsSwimUnit.SWIM_UNIT_METERS}>
              Meters
            </MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Temperature unit"
        action={
          <Select<TemperatureUnitSystem>
            value={temperatureUnit}
            onChange={(event) => setTemperatureUnit(event.target.value as any)}
          >
            <MenuItem
              value={SettingsTemperatureUnit.TEMPERATURE_UNIT_FAHRENHEIT}
            >
              Fahrenheit
            </MenuItem>
            <MenuItem value={SettingsTemperatureUnit.TEMPERATURE_UNIT_CELSIUS}>
              Celsius
            </MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Weight unit"
        action={
          <Select<WeightUnitSystem>
            value={weightUnit}
            onChange={(event) => setWeightUnit(event.target.value as any)}
          >
            <MenuItem value={SettingsWeightUnit.WEIGHT_UNIT_POUNDS}>
              Pounds
            </MenuItem>
            <MenuItem value={SettingsWeightUnit.WEIGHT_UNIT_STONE}>
              Stones
            </MenuItem>
            <MenuItem value={SettingsWeightUnit.WEIGHT_UNIT_KILOGRAMS}>
              Kilograms
            </MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Water unit"
        action={
          <Select<WaterUnitSystem>
            value={waterUnit}
            onChange={(event) => setWaterUnit(event.target.value as any)}
          >
            <MenuItem value={SettingsWaterUnit.WATER_UNIT_FL_OZ}>
              Fluid ounces
            </MenuItem>
            <MenuItem value={SettingsWaterUnit.WATER_UNIT_CUP}>Cups</MenuItem>
            <MenuItem value={SettingsWaterUnit.WATER_UNIT_ML}>
              Milliliters
            </MenuItem>
          </Select>
        }
      />
    </>
  );
}

function LanguageSettings() {
  const [dateFormatPattern, setDateFormatPattern] = useAtom(
    dateFormatPatternAtom,
  );
  const [numberFormatPattern, setNumberFormatPattern] = useAtom(
    numberFormatPatternAtom,
  );
  const [clockHourCycle, setClockHourCycle] = useAtom(clockHourCycleAtom);

  // Hardcoded locale options
  const dateFormatPatternOptions = [
    { value: undefined, label: "Browser default" },
    { value: "en", label: "English" },
    { value: "de", label: "Deutsch" },
    { value: "fr", label: "Francais" },
  ];

  const numberFormatPatternOptions = [
    { value: undefined, label: "Browser default" },
    ...Object.keys(PATTERN_TO_LOCALE).map((pattern) => ({
      value: pattern,
      label: pattern,
    })),
  ];

  // Clock hour cycle options
  const clockHourCycleOptions = [
    { value: undefined, label: "Browser default" },
    { value: "h12", label: "12-hour clock" },
    { value: "h11", label: "12-hour clock (Japan)" },
    { value: "h23", label: "24-hour clock" },
  ];

  const queryClient = useQueryClient();
  const refreshPage = () => queryClient.resetQueries();

  return (
    <>
      <SettingsRow title="Language and formatting">
        Set formatting for times and numbers. This only affects how dates and
        numbers are displayed on this website, and does not change your Fitbit
        account settings.
      </SettingsRow>
      {false /* incomplete */ && (
        <SettingsRow
          title="Date format"
          action={
            <Select
              displayEmpty
              value={dateFormatPattern ?? ""}
              onChange={(e) => {
                setDateFormatPattern((e.target.value as any) || undefined);
              }}
            >
              {dateFormatPatternOptions.map((opt) => (
                <MenuItem key={opt.value ?? ""} value={opt.value ?? ""}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          }
        ></SettingsRow>
      )}
      <SettingsRow
        title="Time format"
        action={
          <Select
            displayEmpty
            value={clockHourCycle ?? ""}
            onChange={(e) => {
              setClockHourCycle((e.target.value as any) || undefined);
              refreshPage();
            }}
          >
            {clockHourCycleOptions.map((opt) => (
              <MenuItem key={opt.value ?? ""} value={opt.value ?? ""}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        }
      ></SettingsRow>
      <SettingsRow
        title="Number format"
        action={
          <Select
            displayEmpty
            value={numberFormatPattern ?? ""}
            onChange={(e) => {
              setNumberFormatPattern((e.target.value as any) || undefined);
              refreshPage();
            }}
          >
            {numberFormatPatternOptions.map((opt) => (
              <MenuItem
                key={opt.value ?? ""}
                value={opt.value ?? ""}
                className="align-middle"
              >
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        }
      ></SettingsRow>
    </>
  );
}

export default function LocaleSettingsPage() {
  return (
    <>
      <SettingsTable>
        <LanguageSettings />
      </SettingsTable>
      <SettingsTable>
        <UnitSettings />
      </SettingsTable>
    </>
  );
}
