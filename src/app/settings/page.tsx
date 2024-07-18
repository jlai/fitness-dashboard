"use client";

import { Suspense, useCallback } from "react";
import {
  Button,
  Container,
  Link,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import { useAtom, useSetAtom } from "jotai";
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
  WaterUnitSystem,
  WeightUnitSystem,
} from "@/api/user";
import {
  distanceUnitAtom,
  foodLogTotalsPositionAtom,
  pollyEnabledAtom,
  waterUnitAtom,
  weightUnitAtom,
} from "@/storage/settings";
import { startPollyAtom, stopPollyAtom } from "@/storage/polly";

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
      {action && <TableCell align="right">{action}</TableCell>}
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

  const switchAccounts = useCallback(() => {
    confirm({
      description: "Log out?",
    }).then(() => {
      queryClient.clear();
      redirectToLogin({ prompt: "login consent" });
    });
  }, [confirm, queryClient]);

  const unlinkAccount = useCallback(() => {
    confirm({
      description: "Sign out and unlink this website from your Fitbit account?",
    }).then(() => {
      revokeAuthorization();
      queryClient.clear();
    });
  }, [confirm, queryClient]);

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

  return (
    <>
      <SettingsRow
        title="Show food totals row"
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
    </>
  );
}

function UnitSettings() {
  const [distanceUnit, setDistanceUnit] = useAtom(distanceUnitAtom);
  const [weightUnit, setWeightUnit] = useAtom(weightUnitAtom);
  const [waterUnit, setWaterUnit] = useAtom(waterUnitAtom);

  return (
    <>
      <SettingsRow title="Unit settings">
        This will not affect your Fitbit account, only the units used on this
        website.
      </SettingsRow>
      <SettingsRow
        title="Distance Units"
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
        title="Weight Units"
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
        title="Water Units"
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

function MainSettings() {
  const confirm = useConfirm();
  const setUserTiles = useSetAtom(userTilesAtom);

  const resetDashboard = useCallback(() => {
    confirm({
      description: "Are you sure you want to reset the dashboard?",
    }).then(() => {
      setUserTiles(RESET);
    });
  }, [confirm, setUserTiles]);

  return (
    <>
      <SettingsRow title="Settings"></SettingsRow>
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
  const [pollyEnabled, setPollyEnabled] = useAtom(pollyEnabledAtom);
  const startPolly = useSetAtom(startPollyAtom);
  const stopPolly = useSetAtom(stopPollyAtom);

  const updatePollyEnabled = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const enable = event.target.checked;

      setPollyEnabled(event.target.checked);

      // Start/stop polly
      if (enable) {
        startPolly();
      } else {
        stopPolly();
      }
    },
    [setPollyEnabled, startPolly, stopPolly]
  );

  return (
    <>
      <SettingsRow title="Developer settings"></SettingsRow>
      <SettingsRow
        title="Enable PollyJS"
        action={<Switch checked={pollyEnabled} onChange={updatePollyEnabled} />}
      >
        Use{" "}
        <Link href="https://pollyjs.com" target="_blank" rel="noreferrer">
          PollyJS
        </Link>{" "}
        to record and replay HTTP requests
      </SettingsRow>
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
        <MainSettings />
      </SettingsTable>
      <SettingsTable>
        <UnitSettings />
      </SettingsTable>
      <SettingsTable>
        <FoodSettings />
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
