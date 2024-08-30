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
  foodLogTotalsPositionAtom,
  increasedTileLimitsAtom,
  swimUnitAtom,
  temperatureUnitAtom,
  waterUnitAtom,
  weightUnitAtom,
  foodLogGoalsPositionAtom,
  macroGoalsAtom,
} from "@/storage/settings";
import { NutritionalValues } from "@/api/nutrition/types";

function SettingsRow({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell colSpan={action ? 1 : 2}>
        <Typography variant="h5">{title}</Typography>
        <Typography variant="body1" component="p">
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
  const { data: userProfile } = useQuery({
    ...buildUserProfileQuery(),
    enabled: hasTokenScope("pro"),
  });

  return (
    userProfile && (
      <>You&apos;re currently logged in as {userProfile.fullName}</>
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
    }).then(() => {
      queryClient.clear();
      redirectToLogin({
        prompt: "login consent",
        requestAdvancedScopes: enableAdvancedScopes,
      });
    });
  };

  const unlinkAccount = () => {
    confirm({
      description: "Sign out and unlink this website from your Fitbit account?",
    }).then(() => {
      revokeAuthorization();
      queryClient.clear();
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
  const [totalsPosition, setTotalsPosition] = useAtom(
    foodLogTotalsPositionAtom
  );
  const [showCopyIndividualButton, setShowCopyIndividualButton] = useAtom(
    foodLogShowCopyIndividualButtonAtom
  );
  const [goalsPosition, setGoalsPosition] = useAtom(
      foodLogGoalsPositionAtom
  );

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
      [key]: value
    });
  };

  return (
    <>
      <SettingsRow title="Nutrition goals"></SettingsRow>
      <SettingsRow
        title="Calories"
        action={
          <TextField
            onChange={(event) => setMacroGoal("calories", parseInt(event.target.value))}
            value={macroGoals.calories}
            name="calories-goal"
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">kCal</InputAdornment>
              ),
            }}
          />
        }
      />
      <SettingsRow
        title="Carbohydrates"
        action={
          <TextField
            onChange={(event) => setMacroGoal("carbs", parseInt(event.target.value))}
            value={macroGoals.carbs}
            name="carbs-goal"
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">g</InputAdornment>
              ),
            }}
          />
        }
      />
      <SettingsRow
        title="Fat"
        action={
          <TextField
            onChange={(event) => setMacroGoal("fat", parseInt(event.target.value))}
            value={macroGoals.fat}
            name="fat-goal"
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">g</InputAdornment>
              ),
            }}
          />
        }
      />
      <SettingsRow
        title="Fibers"
        action={
          <TextField
            onChange={(event) => setMacroGoal("fiber", parseInt(event.target.value))}
            value={macroGoals.fiber}
            name="fibers-goal"
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">g</InputAdornment>
              ),
            }}
          />
        }
      />
      <SettingsRow
        title="Protein"
        action={
          <TextField
            onChange={(event) => setMacroGoal("protein", parseInt(event.target.value))}
            value={macroGoals.protein}
            name="protein-goal"
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">g</InputAdornment>
              ),
            }}
          />
        }
      />
      <SettingsRow
        title="Sodium"
        action={
          <TextField
            onChange={(event) => setMacroGoal("sodium", parseInt(event.target.value))}
            value={macroGoals.sodium}
            name="sodium-goal"
            type="number"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">mg</InputAdornment>
              ),
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
    }).then(() => {
      setUserTiles(RESET);
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
