"use client";

import React, { useCallback, useState } from "react";
import { Button, Switch } from "@mui/material";
import { useAtom, useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { useConfirm } from "material-ui-confirm";
import NextLink from "next/link";

import { userTilesAtom } from "@/storage/tiles";
import { forceTokenRefresh, useLoggedIn } from "@/api/auth";
import { useSwitchAccounts } from "@/components/login/use-switch-accounts";
import { increasedTileLimitsAtom } from "@/storage/settings";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { SettingsRow, SettingsTable } from "../common";

function AdvancedSettings() {
  const confirm = useConfirm();
  const setUserTiles = useSetAtom(userTilesAtom);
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
      <SettingsRow
        title="Migrate settings"
        action={
          <Button href="/settings/migration" LinkComponent={NextLink}>
            Open
          </Button>
        }
      >
        Import dashboard layout, preferences, goals, meals, and custom foods
        previously stored in this browser into Google Drive or session storage.
      </SettingsRow>
    </>
  );
}

function DeveloperSettings() {
  const loggedIn = useLoggedIn();
  const switchAccounts = useSwitchAccounts();
  const [refreshing, setRefreshing] = useState(false);

  const handleForceRefresh = withErrorToaster(async () => {
    setRefreshing(true);

    try {
      await forceTokenRefresh();
      showSuccessToast("OAuth token refreshed");
    } finally {
      setRefreshing(false);
    }
  }, "Failed to refresh OAuth token");

  return (
    <>
      <SettingsRow title="Developer settings"></SettingsRow>
      <SettingsRow
        title="Refresh OAuth token"
        action={
          <Button
            onClick={handleForceRefresh}
            disabled={!loggedIn || refreshing}
          >
            Refresh token
          </Button>
        }
      >
        Force a Google OAuth access token refresh using the current session. For
        debugging token expiry and refresh.
      </SettingsRow>
      <SettingsRow
        title="Switch accounts"
        action={
          <Button onClick={switchAccounts} disabled={!loggedIn}>
            Switch accounts
          </Button>
        }
      >
        Sign in with a different account
      </SettingsRow>
    </>
  );
}

export default function AdvancedSettingsPage() {
  const enableDevSettings =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === "true";

  return (
    <>
      <SettingsTable>
        <AdvancedSettings />
      </SettingsTable>
      {enableDevSettings && (
        <SettingsTable>
          <DeveloperSettings />
        </SettingsTable>
      )}
    </>
  );
}
