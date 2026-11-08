"use client";

import { useCallback } from "react";
import { useConfirm } from "material-ui-confirm";

import { logoutDrive } from "@/api/auth";
import { runWithErrorToaster } from "@/components/toast";
import {
  bumpSettingsStorageEpoch,
  migrateFromDriveOnDisable,
} from "./migrate-from-drive-on-disable";

/**
 * Move Drive app-data settings into Memory, delete the Drive copies, then
 * disconnect Google Drive (revoke at Google and drop the local token).
 */
export function useDisableGoogleDriveSettings() {
  const confirm = useConfirm();

  const disableGoogleDriveSettings = useCallback(async () => {
    await runWithErrorToaster(async () => {
      const { confirmed } = await confirm({
        title: "Disable Google Drive settings?",
        description:
          "This will delete the backup copy of settings, meals, and dashboard layouts from your Google Drive app data folder. A copy will be kept in this browser for the current session only.",
        confirmationText: "Disable",
        confirmationButtonProps: { color: "error" },
        cancellationText: "Cancel",
        allowClose: true,
      });

      if (!confirmed) {
        return;
      }

      await migrateFromDriveOnDisable();
      await logoutDrive();
      bumpSettingsStorageEpoch();
    }, "Failed to disable Google Drive settings");
  }, [confirm]);

  return { disableGoogleDriveSettings };
}
