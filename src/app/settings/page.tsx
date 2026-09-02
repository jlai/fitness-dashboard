"use client";

import React, { useCallback } from "react";
import {
  Button,
  Chip,
  Container,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useAtom, useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { userTilesAtom } from "@/storage/tiles";
import {
  getAccessTokenScopes,
  logout,
  revokeAuthorization,
  useLoggedIn,
  useGoogleLoginAndAuthorization,
} from "@/api/auth";
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
  distanceUnitAtom,
  enableAdvancedScopesAtom,
  foodLogShowCopyIndividualButtonAtom,
  useNutritionGoalsForLabelAtom,
  showNutritionLabelAtom,
  foodLogTotalsPositionAtom,
  increasedTileLimitsAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterUnitAtom,
  weightUnitAtom,
  foodLogGoalsPositionAtom,
  macroGoalsAtom,
  clockHourCycleAtom,
  numberFormatPatternAtom,
  dateFormatPatternAtom,
  stepsGoalAtom,
  weeklyStepsGoalAtom,
  floorsGoalAtom,
  weeklyFloorsGoalAtom,
  distanceGoalAtom,
  weeklyDistanceGoalAtom,
  caloriesOutGoalAtom,
  weeklyCaloriesOutGoalAtom,
  activeMinutesGoalAtom,
  weeklyActiveMinutesGoalAtom,
  activeZoneMinutesGoalAtom,
  weeklyActiveZoneMinutesGoalAtom,
  waterGoalAtom,
  weeklyWaterGoalAtom,
} from "@/storage/settings";
import { NutritionalValues } from "@/api/nutrition/types";
import { PATTERN_TO_LOCALE } from "@/utils/number-formats";
import { getScopeName } from "@/config/scopes";
import {
  kilometersFromDistanceGoal,
  millilitersFromWaterGoal,
  useUnits,
} from "@/config/units";

function SettingsRow({
  title,
  action,
  children,
  component = "p",
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  component?: React.ElementType;
}) {
  return (
    <TableRow>
      <TableCell colSpan={action ? 1 : 2}>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body1" component={component}>
          {children}
        </Typography>
      </TableCell>
      {action && (
        <TableCell align="right" className="min-w-[200px]">
          {action}
        </TableCell>
      )}
    </TableRow>
  );
}

function LoginSettings() {
  const loggedIn = useLoggedIn();

  return loggedIn ? <LoggedInAccountSettings /> : <LoggedOutAccountSettings />;
}

function LoggedOutAccountSettings() {
  const { loginToGoogleAndAuthorize, ready } = useGoogleLoginAndAuthorization();

  return (
    <SettingsRow
      title="Google account"
      action={
        <Button onClick={() => loginToGoogleAndAuthorize()} disabled={!ready}>
          Login
        </Button>
      }
    >
      You&apos;re not currently logged in.
    </SettingsRow>
  );
}

function LoggedInAccountSettings() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const scopes = getAccessTokenScopes();
  const { loginToGoogleAndAuthorize } = useGoogleLoginAndAuthorization({
    selectAccount: true,
    includeGrantedScopes: false,
  });

  const handleLogout = () => {
    confirm({
      description: "Log out?",
    }).then(({ confirmed }) => {
      if (confirmed) {
        logout();
        queryClient.clear();
        router.replace("/");
      }
    });
  };

  const switchAccounts = () => {
    confirm({
      description: "Log out?",
    }).then(({ confirmed }) => {
      if (confirmed) {
        queryClient.clear();
        loginToGoogleAndAuthorize();
      }
    });
  };

  const unlinkAccount = () => {
    confirm({
      description: "Sign out and unlink this website from your Google account?",
    }).then(async ({ confirmed }) => {
      if (confirmed) {
        await revokeAuthorization();
        queryClient.clear();
        router.replace("/");
      }
    });
  };

  return (
    <>
      <SettingsRow
        title="Google account"
        action={<Button onClick={handleLogout}>Logout</Button>}
      >
        You&apos;re currently logged in
      </SettingsRow>
      {scopes && scopes.size > 0 && (
        <SettingsRow title="Granted permissions" component="div">
          <div>
            These are the permissions that this website is allowed to access from your Google Health account.
            To remove permissions, unlink your account and sign in again.
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[...scopes]
              .sort((a, b) => getScopeName(a).localeCompare(getScopeName(b)))
              .map((scope) => (
                <Chip key={scope} label={getScopeName(scope)} size="small" />
              ))}
          </div>
        </SettingsRow>
      )}
      <SettingsRow
        title="Switch accounts"
        action={<Button onClick={switchAccounts}>Switch accounts</Button>}
      >
        Sign in with a different account
      </SettingsRow>
      <SettingsRow
        title="Unlink Google account"
        action={
          <Button color="error" onClick={unlinkAccount}>
            Unlink
          </Button>
        }
      >
        Unlink this website from your Google account and remove all permissions.
        You will need to sign in again to use the website.
      </SettingsRow>
    </>
  );
}

function FoodSettings() {
  const [useNutritionGoalsForLabel, setUseNutritionGoalsForLabel] = useAtom(
    useNutritionGoalsForLabelAtom,
  );
  const [showNutritionLabel, setShowNutritionLabelAtom] = useAtom(
    showNutritionLabelAtom,
  );
  const [totalsPosition, setTotalsPosition] = useAtom(
    foodLogTotalsPositionAtom,
  );
  const [showCopyIndividualButton, setShowCopyIndividualButton] = useAtom(
    foodLogShowCopyIndividualButtonAtom,
  );
  const [goalsPosition, setGoalsPosition] = useAtom(foodLogGoalsPositionAtom);

  return (
    <>
      <SettingsRow
        title="Show the food totals row"
        action={
          <Select<typeof totalsPosition>
            value={totalsPosition}
            onChange={(event) => setTotalsPosition(event.target.value as any)}
          >
            <MenuItem value="top">On top</MenuItem>
            <MenuItem value="bottom">On bottom</MenuItem>
            <MenuItem value="both">Both top/bottom</MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Show the nutrition goals table"
        action={
          <Select<typeof goalsPosition>
            value={goalsPosition}
            onChange={(event) => setGoalsPosition(event.target.value as any)}
          >
            <MenuItem value="hidden">Hidden</MenuItem>
            <MenuItem value="top">On top</MenuItem>
            <MenuItem value="bottom">On bottom</MenuItem>
            <MenuItem value="both">Both top/bottom</MenuItem>
          </Select>
        }
      />
      <SettingsRow
        title="Show the nutrition facts label"
        action={
          <Switch
            checked={showNutritionLabel}
            onChange={(_event, checked) => setShowNutritionLabelAtom(checked)}
          />
        }
      >
        Show the nutrition facts label in the custom food edition dialog
        details.
      </SettingsRow>
      <SettingsRow
        title="Use nutrition goals for nutrition labels"
        action={
          <Switch
            disabled={!showNutritionLabel}
            checked={useNutritionGoalsForLabel}
            onChange={(_event, checked) =>
              setUseNutritionGoalsForLabel(checked)
            }
          />
        }
      >
        Use nutrition goals for nutrition labels when calculating the % of daily
        values.
      </SettingsRow>
      <SettingsRow
        title="Show copy to clipboard button for individual values"
        action={
          <Switch
            checked={showCopyIndividualButton}
            onChange={(_event, value) => setShowCopyIndividualButton(value)}
          />
        }
      />
    </>
  );
}

function MacroGoals() {
  const [macroGoals, setMacroGoals] = useAtom(macroGoalsAtom);
  // Update one goal value
  const setMacroGoal = (key: keyof NutritionalValues, value: number) => {
    setMacroGoals({
      ...macroGoals,
      [key]: value,
    });
  };

  return (
    <>
      <SettingsRow title="Nutrition goals"></SettingsRow>
      <SettingsRow
        title="Calories"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("calories", parseInt(event.target.value))
            }
            value={macroGoals.calories}
            name="calories-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">kCal</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Carbohydrates"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("carbs", parseInt(event.target.value))
            }
            value={macroGoals.carbs}
            name="carbs-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Fat"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("fat", parseInt(event.target.value))
            }
            value={macroGoals.fat}
            name="fat-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Fibers"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("fiber", parseInt(event.target.value))
            }
            value={macroGoals.fiber}
            name="fibers-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Protein"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("protein", parseInt(event.target.value))
            }
            value={macroGoals.protein}
            name="protein-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">g</InputAdornment>,
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Sodium"
        action={
          <TextField
            onChange={(event) =>
              setMacroGoal("sodium", parseInt(event.target.value))
            }
            value={macroGoals.sodium}
            name="sodium-goal"
            type="number"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mg</InputAdornment>
                ),
              },
            }}
          />
        }
      />
    </>
  );
}

function ActivityGoalsSettings() {
  const [stepsGoal, setStepsGoal] = useAtom(stepsGoalAtom);
  const [weeklyStepsGoal, setWeeklyStepsGoal] = useAtom(weeklyStepsGoalAtom);
  const [floorsGoal, setFloorsGoal] = useAtom(floorsGoalAtom);
  const [weeklyFloorsGoal, setWeeklyFloorsGoal] = useAtom(weeklyFloorsGoalAtom);
  const [distanceGoal, setDistanceGoal] = useAtom(distanceGoalAtom);
  const [weeklyDistanceGoal, setWeeklyDistanceGoal] = useAtom(
    weeklyDistanceGoalAtom,
  );
  const [caloriesOutGoal, setCaloriesOutGoal] = useAtom(caloriesOutGoalAtom);
  const [weeklyCaloriesOutGoal, setWeeklyCaloriesOutGoal] = useAtom(
    weeklyCaloriesOutGoalAtom,
  );
  const [activeMinutesGoal, setActiveMinutesGoal] = useAtom(
    activeMinutesGoalAtom,
  );
  const [weeklyActiveMinutesGoal, setWeeklyActiveMinutesGoal] = useAtom(
    weeklyActiveMinutesGoalAtom,
  );
  const [activeZoneMinutesGoal, setActiveZoneMinutesGoal] = useAtom(
    activeZoneMinutesGoalAtom,
  );
  const [weeklyActiveZoneMinutesGoal, setWeeklyActiveZoneMinutesGoal] = useAtom(
    weeklyActiveZoneMinutesGoalAtom,
  );
  const [waterGoal, setWaterGoal] = useAtom(waterGoalAtom);
  const [weeklyWaterGoal, setWeeklyWaterGoal] = useAtom(weeklyWaterGoalAtom);

  const {
    distanceUnit,
    waterUnit,
    localizedKilometers,
    localizedKilometersName,
    localizedWaterVolume,
    localizedWaterVolumeName,
  } = useUnits();

  const setNumericGoal = (
    setter: (value: number) => void,
    rawValue: string,
  ) => {
    const value = parseFloat(rawValue);
    if (Number.isFinite(value)) {
      setter(value);
    }
  };

  return (
    <>
      <SettingsRow title="Goals">
        Set goals displayed on the dashboard. This does NOT affect your Fitbit
        account or app. The Google Health API currently does not allow us to get
        goals from your account, so you have to set them here.
      </SettingsRow>
      <SettingsRow
        title="Daily steps"
        action={
          <TextField
            value={stepsGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setStepsGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">steps</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly steps"
        action={
          <TextField
            value={weeklyStepsGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setWeeklyStepsGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">steps</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily floors"
        action={
          <TextField
            value={floorsGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setFloorsGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">floors</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly floors"
        action={
          <TextField
            value={weeklyFloorsGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setWeeklyFloorsGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">floors</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily distance"
        action={
          <TextField
            value={localizedKilometers(
              kilometersFromDistanceGoal(distanceGoal.value, distanceGoal.unit),
            )}
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setDistanceGoal({ value, unit: distanceUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedKilometersName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly distance"
        action={
          <TextField
            value={localizedKilometers(
              kilometersFromDistanceGoal(
                weeklyDistanceGoal.value,
                weeklyDistanceGoal.unit,
              ),
            )}
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setWeeklyDistanceGoal({ value, unit: distanceUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedKilometersName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily calories burned"
        action={
          <TextField
            value={caloriesOutGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setCaloriesOutGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">Cal</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly calories burned"
        action={
          <TextField
            value={weeklyCaloriesOutGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setWeeklyCaloriesOutGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">Cal</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily active minutes"
        action={
          <TextField
            value={activeMinutesGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setActiveMinutesGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly active minutes"
        action={
          <TextField
            value={weeklyActiveMinutesGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setWeeklyActiveMinutesGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily active zone minutes"
        action={
          <TextField
            value={activeZoneMinutesGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setActiveZoneMinutesGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly active zone minutes"
        action={
          <TextField
            value={weeklyActiveZoneMinutesGoal}
            type="number"
            onChange={(event) =>
              setNumericGoal(setWeeklyActiveZoneMinutesGoal, event.target.value)
            }
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">mins</InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Daily water"
        action={
          <TextField
            value={localizedWaterVolume(
              millilitersFromWaterGoal(waterGoal.value, waterGoal.unit),
            )}
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setWaterGoal({ value, unit: waterUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedWaterVolumeName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
      <SettingsRow
        title="Weekly water"
        action={
          <TextField
            value={localizedWaterVolume(
              millilitersFromWaterGoal(
                weeklyWaterGoal.value,
                weeklyWaterGoal.unit,
              ),
            )}
            type="number"
            onChange={(event) => {
              const value = parseFloat(event.target.value);
              if (Number.isFinite(value)) {
                setWeeklyWaterGoal({ value, unit: waterUnit });
              }
            }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {localizedWaterVolumeName}
                  </InputAdornment>
                ),
              },
            }}
          />
        }
      />
    </>
  );
}

function UnitSettings() {
  const [distanceUnit, setDistanceUnit] = useAtom(distanceUnitAtom);
  const [swimUnit, setSwimUnit] = useAtom(swimUnitAtom);
  const [temperatureUnit, setTemperatureUnit] = useAtom(temperatureUnitAtom);

  const [weightUnit, setWeightUnit] = useAtom(weightUnitAtom);
  const [waterUnit, setWaterUnit] = useAtom(waterUnitAtom);

  return (
    <>
      <SettingsRow title="Unit settings">
        This will not affect your Fitbit account, only the units used on this
        website.
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

function AdvancedSettings() {
  const confirm = useConfirm();
  const setUserTiles = useSetAtom(userTilesAtom);
  const [enableAdvancedScopes, setEnableAdvancedScopes] = useAtom(
    enableAdvancedScopesAtom,
  );
  const [increasedTileLimits, setIncreasedTileLimits] = useAtom(
    increasedTileLimitsAtom,
  );

  const resetDashboard = useCallback(() => {
    confirm({
      description: "Are you sure you want to reset the dashboard?",
    }).then(({ confirmed }) => {
      if (confirmed) {
        setUserTiles(RESET);
      }
    });
  }, [confirm, setUserTiles]);

  return (
    <>
      <SettingsRow title="Advanced settings"></SettingsRow>
      <SettingsRow
        title="Show advanced body metrics"
        action={
          <Switch
            checked={enableAdvancedScopes}
            onChange={(_event, checked) => setEnableAdvancedScopes(checked)}
          />
        }
      >
        Enable graphs for breathing rate, skin temperature, VO2 Max. This
        requires granting additional permissions.
      </SettingsRow>
      <SettingsRow
        title="Ignore tile limit"
        action={
          <Switch
            checked={increasedTileLimits}
            onChange={(_event, checked) => setIncreasedTileLimits(checked)}
          />
        }
      >
        Allow increased number of dashboard tiles. This may cause you to exceed
        the hourly API request limit if you frequently refresh the dashboard or
        navigate to other days.
      </SettingsRow>
      <SettingsRow
        title="Reset dashboard"
        action={
          <Button color="error" onClick={resetDashboard}>
            Reset dashboard
          </Button>
        }
      >
        Reset the dashboard grid to the default layout
      </SettingsRow>
    </>
  );
}

function DeveloperSettings() {
  return (
    <>
      <SettingsRow title="Developer settings"></SettingsRow>
    </>
  );
}

function SettingsTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8">
      <TableContainer component={Paper}>
        <Table>
          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default function SettingsPage() {
  const enableDevSettings =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === "true";

  return (
    <Container maxWidth="lg">
      <SettingsTable>
        <LoginSettings />
      </SettingsTable>
      <SettingsTable>
        <LanguageSettings />
      </SettingsTable>
      <SettingsTable>
        <UnitSettings />
      </SettingsTable>
      <SettingsTable>
        <FoodSettings />
      </SettingsTable>
      <SettingsTable>
        <MacroGoals />
      </SettingsTable>
      <SettingsTable>
        <ActivityGoalsSettings />
      </SettingsTable>
      <SettingsTable>
        <AdvancedSettings />
      </SettingsTable>
      {enableDevSettings && (
        <SettingsTable>
          <DeveloperSettings />
        </SettingsTable>
      )}
    </Container>
  );
}
