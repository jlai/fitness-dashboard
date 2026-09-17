"use client";

import { useState } from "react";
import { Alert, Button, Paper, Typography } from "@mui/material";

import { useDriveAuthEnabled } from "@/api/auth";
import RequireLogin from "@/components/require-login";
import { importLegacySettings } from "@/storage/settings-storage/migrate-from-legacy";
import { useEnableGoogleDriveSettings } from "@/storage/settings-storage";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

function MigrationContent() {
  const driveEnabled = useDriveAuthEnabled();
  const { enableGoogleDriveSettings, ready: driveAuthReady } =
    useEnableGoogleDriveSettings();
  const [importing, setImporting] = useState(false);

  const handleImport = withErrorToaster(async () => {
    setImporting(true);
    try {
      await importLegacySettings();
      showSuccessToast("Imported settings from this browser");
    } finally {
      setImporting(false);
    }
  }, "Failed to import settings");

  return (
    <Paper className="flex flex-col gap-4 p-6">
      <Typography variant="h5" component="h1">
        Migrate settings
      </Typography>
      <Typography>
        Import dashboard layout, preferences, goals, meals, and custom foods
        that were previously stored in this browser (localStorage and IndexedDB)
        into Settings storage. Legacy data is not deleted; you can wipe it later
        from Advanced settings.
      </Typography>

      {!driveEnabled && (
        <Alert severity="info">
          Google Drive app data is not enabled. Enable Drive so imported
          settings sync across devices; otherwise they stay in this browser
          session only.
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {!driveEnabled && (
          <Button
            variant="outlined"
            onClick={() => void enableGoogleDriveSettings()}
            disabled={!driveAuthReady}
          >
            Enable Google Drive
          </Button>
        )}
        <Button
          variant="contained"
          onClick={() => void handleImport()}
          disabled={importing || !driveEnabled}
        >
          {importing ? "Importing…" : "Import old settings"}
        </Button>
      </div>
    </Paper>
  );
}

export default function SettingsMigrationPage() {
  return (
    <RequireLogin>
      <MigrationContent />
    </RequireLogin>
  );
}
