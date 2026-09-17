"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import NextLink from "next/link";

import { useMissingDriveScopes } from "@/api/auth";
import RequireLogin from "@/components/require-login";
import { DRIVE_APPDATA } from "@/config/google-drive-scopes";
import { importLegacySettings } from "@/storage/settings-storage/migrate-from-legacy";
import { useEnableGoogleDriveSettings } from "@/storage/settings-storage";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

function MigrationContent() {
  const missingDriveScopes = useMissingDriveScopes([DRIVE_APPDATA]);
  const driveEnabled = missingDriveScopes.length === 0;
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
    <Container maxWidth="md" className="py-8">
      <Button component={NextLink} href="/settings" className="mb-4">
        Back to settings
      </Button>

      <Paper className="p-6 flex flex-col gap-4">
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
    </Container>
  );
}

export default function SettingsMigrationPage() {
  return (
    <RequireLogin>
      <MigrationContent />
    </RequireLogin>
  );
}
