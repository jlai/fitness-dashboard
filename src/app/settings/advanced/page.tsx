"use client";

import React, { useCallback, useState } from "react";
import { Button, Switch } from "@mui/material";
import { useAtom, useSetAtom } from "jotai";
import { RESET } from "jotai/utils";
import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import NextLink from "next/link";

import { userTilesAtom } from "@/storage/tiles";
import {
  forceTokenRefresh,
  logout,
  useLoggedIn,
} from "@/api/auth";
import { useSwitchAccounts } from "@/components/login/use-switch-accounts";
import { increasedTileLimitsAtom } from "@/storage/settings";
import { wipeLocalData } from "@/storage/wipe-local-data";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

import { SettingsRow, SettingsTable } from "../common";

function AdvancedSettings() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
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

  const wipeData = useCallback(() => {
    confirm({
      title: "Wipe local data",
      description:
        "Permanently remove any saved goals, meals, and settings from this browser? You will also be signed out.",
      confirmationText: "Wipe data",
      confirmationButtonProps: { color: "error" },
    }).then(async ({ confirmed }) => {
      if (!confirmed) {
        return;
      }

      await logout();
      await wipeLocalData();
      queryClient.clear();
      window.location.assign("/");
    });
  }, [confirm, queryClient]);

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
        title="Wipe local data"
        action={
          <Button color="error" onClick={wipeData}>
            Wipe data
          </Button>
        }
      >
        Erase all saved goals, meals, and settings stored in this browser. This
        also signs you out.
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
