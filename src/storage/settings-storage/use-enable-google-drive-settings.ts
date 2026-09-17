"use client";

import { useCallback } from "react";
import { useConfirm } from "material-ui-confirm";

import { useGoogleLoginAndAuthorization } from "@/api/auth";
import { DRIVE_APPDATA } from "@/config/google-drive-scopes";
import { withErrorToaster } from "@/components/toast";
import type { SettingsStorageKey } from "./keys";
import {
  reconcileMemoryAndDriveOnEnable,
  settingsStorageKeyLabel,
} from "./reconcile-on-drive-enable";

/**
 * Authorize drive.appdata, then merge Memory ↔ Drive settings.
 * One conflict dialog covers every key that exists on both sides.
 */
export function useEnableGoogleDriveSettings() {
  const confirm = useConfirm();
  const { loginToGoogleAndAuthorize, ready } = useGoogleLoginAndAuthorization({
    additionalScopes: [DRIVE_APPDATA],
  });

  const enableGoogleDriveSettings = useCallback(
    withErrorToaster(async () => {
      await loginToGoogleAndAuthorize();

      await reconcileMemoryAndDriveOnEnable({
        resolveConflicts: async (conflictingKeys: SettingsStorageKey[]) => {
          const labels = conflictingKeys
            .map(settingsStorageKeyLabel)
            .join(", ");
          const { confirmed } = await confirm({
            title: "Settings already exist in Google Drive",
            description: `These settings exist both in this browser and in Google Drive: ${labels}. Which version should be kept for all of them?`,
            confirmationText: "Keep this browser",
            cancellationText: "Keep Google Drive",
            allowClose: true,
          });

          return confirmed ? "memory" : "drive";
        },
      });
    }, "Failed to enable Google Drive settings"),
    [confirm, loginToGoogleAndAuthorize],
  );

  return { enableGoogleDriveSettings, ready };
}
