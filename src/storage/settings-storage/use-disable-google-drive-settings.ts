"use client";

import { useCallback } from "react";
import { useConfirm } from "material-ui-confirm";

import { clearEncryptedDriveAuth } from "@/api/auth";
import { withErrorToaster } from "@/components/toast";
import {
  bumpSettingsStorageEpoch,
  migrateFromDriveOnDisable,
} from "./migrate-from-drive-on-disable";

/**
 * Move Drive app-data settings into Memory, delete the Drive copies, then drop
 * the local encrypted Drive token (without revoking at Google).
 */
export function useDisableGoogleDriveSettings() {
  const confirm = useConfirm();

  const disableGoogleDriveSettings = useCallback(
    withErrorToaster(async () => {
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
      clearEncryptedDriveAuth();
      bumpSettingsStorageEpoch();
    }, "Failed to disable Google Drive settings"),
    [confirm],
  );

  return { disableGoogleDriveSettings };
}
