"use client";

import { Suspense, useCallback } from "react";
import {
  Button,
  Container,
  Link,
  Paper,
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
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import { userTilesAtom } from "@/storage/tiles";
import { redirectToLogin, revokeAuthorization, useLoggedIn } from "@/api/auth";
import { buildUserProfileQuery } from "@/api/user";
import { pollyEnabledAtom } from "@/storage/settings";
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
  const { data: userProfile } = useSuspenseQuery(buildUserProfileQuery());

  return <>You&apos;re currently logged in as {userProfile.fullName}</>;
}

function LoginSettings() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const switchAccounts = useCallback(() => {
    confirm({
      description: "Log out and switch accounts?",
    }).then(() => {
      queryClient.clear();
      redirectToLogin({ prompt: "login" });
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
        title="Switch accounts"
        action={<Button onClick={switchAccounts}>Switch accounts</Button>}
      >
        Switch to a different Fitbit account
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
