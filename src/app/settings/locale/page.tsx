"use client";

import { Button, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { useAtom, useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";

import { hasTokenScope } from "@/api/auth";
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
import { SETTINGS_READONLY } from "@/config/google-health-scopes";
import { useApiUnitDefaults } from "@/config/units";
import {
  clearUnitSettingsAtom,
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

/**
 * Persist a unit only when it differs from the Google Health default.
 * Selecting the API default clears any local override.
 */
function setUnitOverride<T>(
  setValue: (next: T | undefined) => void,
  apiDefault: T | undefined,
  next: T,
) {
  if (apiDefault !== undefined && next === apiDefault) {
    setValue(undefined);
  } else {
    setValue(next);
  }
}

function UnitSettings() {
  const [distanceUnit, setDistanceUnit] = useAtom(distanceUnitAtom);
  const [swimUnit, setSwimUnit] = useAtom(swimUnitAtom);
  const [temperatureUnit, setTemperatureUnit] = useAtom(temperatureUnitAtom);

  const [weightUnit, setWeightUnit] = useAtom(weightUnitAtom);
  const [waterUnit, setWaterUnit] = useAtom(waterUnitAtom);
  const clearUnitSettings = useSetAtom(clearUnitSettingsAtom);

  const apiDefaults = useApiUnitDefaults();
  const hasSettingsScope = hasTokenScope(SETTINGS_READONLY);
  const hasUnitOverrides = Boolean(
    distanceUnit || swimUnit || temperatureUnit || weightUnit || waterUnit,
  );

  return (
    <>
      <SettingsRow
        title="Unit settings"
        action={
          hasSettingsScope ? (
            <Button
              onClick={() => void clearUnitSettings()}
              disabled={!hasUnitOverrides}
            >
              Reset to defaults
            </Button>
          ) : undefined
        }
      >
        This will not affect your Google Health account, only the units used on
        this website.
      </SettingsRow>
      <SettingsRow
        title="Distance unit"
        action={
          <Select
            displayEmpty
            value={distanceUnit ?? apiDefaults?.distanceUnit ?? ""}
            onChange={(event: SelectChangeEvent<string>) =>
              setUnitOverride(
                setDistanceUnit,
                apiDefaults?.distanceUnit,
                event.target.value as DistanceUnitSystem,
              )
            }
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
          <Select
            displayEmpty
            value={swimUnit ?? apiDefaults?.swimUnit ?? ""}
            onChange={(event: SelectChangeEvent<string>) =>
              setUnitOverride(
                setSwimUnit,
                apiDefaults?.swimUnit,
                event.target.value as SwimUnitSystem,
              )
            }
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
          <Select
            displayEmpty
            value={temperatureUnit ?? apiDefaults?.temperatureUnit ?? ""}
            onChange={(event: SelectChangeEvent<string>) =>
              setUnitOverride(
                setTemperatureUnit,
                apiDefaults?.temperatureUnit,
                event.target.value as TemperatureUnitSystem,
              )
            }
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
          <Select
            displayEmpty
            value={weightUnit ?? apiDefaults?.weightUnit ?? ""}
            onChange={(event: SelectChangeEvent<string>) =>
              setUnitOverride(
                setWeightUnit,
                apiDefaults?.weightUnit,
                event.target.value as WeightUnitSystem,
              )
            }
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
          <Select
            displayEmpty
            value={waterUnit ?? apiDefaults?.waterUnit ?? ""}
            onChange={(event: SelectChangeEvent<string>) =>
              setUnitOverride(
                setWaterUnit,
                apiDefaults?.waterUnit,
                event.target.value as WaterUnitSystem,
              )
            }
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
