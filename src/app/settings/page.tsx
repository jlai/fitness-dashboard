"use client";

import React, { Suspense, useCallback } from "react";
import {
  Button,
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
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { useConfirm } from "material-ui-confirm";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { userTilesAtom } from "@/storage/tiles";
import {
  hasTokenScope,
  redirectToLogin,
  revokeAuthorization,
  useLoggedIn,
  userIdAtom,
} from "@/api/auth";
import {
  buildUserProfileQuery,
  DistanceUnitSystem,
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
  allowAPIProxyAtom,
  clockHourCycleAtom,
  numberFormatPatternAtom,
  dateFormatPatternAtom,
} from "@/storage/settings";
import { NutritionalValues } from "@/api/nutrition/types";
import { FITBIT_API_PROXY_URL, HOST_WEBSITE_NAME } from "@/config";
import { PATTERN_TO_LOCALE } from "@/utils/number-formats";

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

function LoginInfo() {
  const encodedId = useAtomValue(userIdAtom);
  const { data: userProfile } = useQuery({
    ...buildUserProfileQuery(),
    enabled: hasTokenScope("pro"),
  });

  return userProfile ? (
    <>
      You&apos;re currently logged in as {userProfile.fullName} (Fitbit ID{" "}
      <code>{encodedId}</code>)
    </>
  ) : (
    encodedId && (
      <>
        You&apos;re currently logged in as Fitbit ID <code>{encodedId}</code>
      </>
    )
  );
}

function LoginSettings() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const enableAdvancedScopes = useAtomValue(enableAdvancedScopesAtom);

  const switchAccounts = () => {
    confirm({
      description: "Log out?",
    }).then(({ confirmed }) => {
      if (confirmed) {
        queryClient.clear();
        redirectToLogin({
          prompt: "login consent",
          requestAdvancedScopes: enableAdvancedScopes,
        });
      }
    });
  };

  const unlinkAccount = () => {
    confirm({
      description: "Sign out and unlink this website from your Fitbit account?",
    }).then(({ confirmed }) => {
      if (confirmed) {
        revokeAuthorization();
        queryClient.clear();
      }
    });
  };

  return (
    <>
      <SettingsRow
        title="Fitbit account"
        action={<Button onClick={switchAccounts}>Logout</Button>}
      >
        <Suspense fallback={<></>}>
          <LoginInfo />
        </Suspense>
      </SettingsRow>
      <SettingsRow
        title="Change permissions / switch accounts"
        action={<Button onClick={switchAccounts}>Switch accounts</Button>}
      >
        Change permissions or sign in with a different account
      </SettingsRow>
      <SettingsRow
        title="Unlink Fitbit account"
        action={
          <Button color="error" onClick={unlinkAccount}>
            Unlink
          </Button>
        }
      >
        Unlink access to Fitbit account from this website (across all browser
        sessions)
      </SettingsRow>
    </>
  );
}

function FoodSettings() {
  const [useNutritionGoalsForLabel, setUseNutritionGoalsForLabel] = useAtom(
    useNutritionGoalsForLabelAtom
  );
  const [showNutritionLabel, setShowNutritionLabelAtom] = useAtom(
    showNutritionLabelAtom
  );
  const [totalsPosition, setTotalsPosition] = useAtom(
    foodLogTotalsPositionAtom
  );
  const [showCopyIndividualButton, setShowCopyIndividualButton] = useAtom(
    foodLogShowCopyIndividualButtonAtom
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
            <MenuItem value="en_US">Miles</MenuItem>
            <MenuItem value="METRIC">Kilometers</MenuItem>
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
            <MenuItem value="en_US">Yards</MenuItem>
            <MenuItem value="METRIC">Meters</MenuItem>
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
            <MenuItem value="en_US">Fahrenheit</MenuItem>
            <MenuItem value="METRIC">Celsius</MenuItem>
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
            <MenuItem value="en_US">Pounds</MenuItem>
            <MenuItem value="en_GB">Stones</MenuItem>
            <MenuItem value="METRIC">Kilograms</MenuItem>
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
            <MenuItem value="en_US">Fluid ounces</MenuItem>
            <MenuItem value="METRIC">Milliliters</MenuItem>
          </Select>
        }
      />
    </>
  );
}

function LanguageSettings() {
  const [dateFormatPattern, setDateFormatPattern] = useAtom(
    dateFormatPatternAtom
  );
  const [numberFormatPattern, setNumberFormatPattern] = useAtom(
    numberFormatPatternAtom
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

function WorkaroundSettings() {
  const [allowAPIProxy, setAllowAPIProxy] = useAtom(allowAPIProxyAtom);

  const queryClient = useQueryClient();

  return (
    <>
      <SettingsRow title="Workarounds"></SettingsRow>
      <SettingsRow
        title="Access Fitbit server through Cloudflare proxy"
        component="div"
        action={
          <Switch
            checked={allowAPIProxy}
            onChange={(_event, checked) => {
              setAllowAPIProxy(checked);
              queryClient.clear();
            }}
          />
        }
      >
        <div className="space-y-2">
          <p>
            Use {HOST_WEBSITE_NAME} and Cloudflare servers to access Fitbit API.
            Instead of accessing your Fitbit data directly from Fitbit&apos;s
            servers, the request from your browser will be passed through a 3rd
            party server. Your data will not be stored or logged by the
            intermediary servers.
          </p>
          <p>
            This is a <i>temporary</i> option to work around a Fitbit API bug
            (missing cross-origin request headers). If you&apos;re not
            comfortable enabling this, hang tight and wait for Fitbit to fix
            this API issue.
          </p>
        </div>
      </SettingsRow>
    </>
  );
}

function AdvancedSettings() {
  const confirm = useConfirm();
  const setUserTiles = useSetAtom(userTilesAtom);
  const [enableAdvancedScopes, setEnableAdvancedScopes] = useAtom(
    enableAdvancedScopesAtom
  );
  const [increasedTileLimits, setIncreasedTileLimits] = useAtom(
    increasedTileLimitsAtom
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

  const loggedIn = useLoggedIn();

  return (
    <Container maxWidth="lg">
      {FITBIT_API_PROXY_URL && (
        <SettingsTable>
          <WorkaroundSettings />
        </SettingsTable>
      )}
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
        <AdvancedSettings />
      </SettingsTable>
      {loggedIn && (
        <SettingsTable>
          <LoginSettings />
        </SettingsTable>
      )}
      {enableDevSettings && (
        <SettingsTable>
          <DeveloperSettings />
        </SettingsTable>
      )}
    </Container>
  );
}
