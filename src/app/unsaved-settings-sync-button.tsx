"use client";

import { Save as SaveIcon } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useConfirm } from "material-ui-confirm";
import { useCallback } from "react";

import { useDriveAuthEnabled, useLoggedIn } from "@/api/auth";
import {
  useEnableGoogleDriveSettings,
  useHasMemorySettingsStored,
} from "@/storage/settings-storage";

/**
 * Shown when the user is signed in without Google Drive, and session settings
 * live only in memory (lost on browser close).
 */
export default function UnsavedSettingsSyncButton() {
  const loggedIn = useLoggedIn();
  const driveEnabled = useDriveAuthEnabled();
  const hasMemorySettings = useHasMemorySettingsStored();
  const confirm = useConfirm();
  const { enableGoogleDriveSettings, ready } = useEnableGoogleDriveSettings();

  const handleClick = useCallback(() => {
    void (async () => {
      const { confirmed } = await confirm({
        title: "Unsaved settings",
        description:
          "You have settings that are not saved to Google Drive. The settings will be lost when you close your browser. Sync to Google Drive?",
        confirmationText: "Sync to drive",
        cancellationText: "Cancel",
        allowClose: true,
      });

      if (!confirmed) {
        return;
      }

      await enableGoogleDriveSettings();
    })();
  }, [confirm, enableGoogleDriveSettings]);

  if (!loggedIn || driveEnabled || !hasMemorySettings) {
    return null;
  }

  return (
    <IconButton
      onClick={handleClick}
      disabled={!ready}
      aria-label="Sync settings to Google Drive"
      color="warning"
    >
      <SaveIcon />
    </IconButton>
  );
}
