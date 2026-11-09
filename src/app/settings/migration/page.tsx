"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Alert, Button, Paper, Typography } from "@mui/material";
import { useConfirm } from "material-ui-confirm";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useDriveAuthEnabled } from "@/api/auth";
import RequireLogin from "@/components/require-login";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import {
  clearFitbitAuthToken,
  clearMigrationBackupStorage,
  hasMigrationBackupStorage,
  parseMigrationBackupFile,
} from "@/storage/db/fitbitmigrationdb";
import { useEnableGoogleDriveSettings } from "@/storage/settings-storage";
import {
  importFitbitMigrationFile,
  importLegacySettings,
} from "@/storage/settings-storage/migrate-from-legacy";

function MigrationContent() {
  const router = useRouter();
  const confirm = useConfirm();
  const driveEnabled = useDriveAuthEnabled();
  const { enableGoogleDriveSettings, ready: driveAuthReady } =
    useEnableGoogleDriveSettings();
  const [importing, setImporting] = useState(false);
  const [hasMigrationBackup, setHasMigrationBackup] = useState(false);

  useEffect(() => {
    setHasMigrationBackup(hasMigrationBackupStorage());
  }, []);

  const handleImport = withErrorToaster(async () => {
    setImporting(true);
    try {
      await importLegacySettings();
      clearMigrationBackupStorage();
      clearFitbitAuthToken();
      setHasMigrationBackup(false);
      showSuccessToast("Imported settings from this browser");
      router.replace("/");
    } finally {
      setImporting(false);
    }
  }, "Failed to import settings");

  const handleFileImport = withErrorToaster(async (file: File) => {
    setImporting(true);
    try {
      const backup = parseMigrationBackupFile(await file.text());
      await importFitbitMigrationFile(backup);
      clearFitbitAuthToken();
      showSuccessToast("Imported Fitbit backup from file");
      router.replace("/");
    } finally {
      setImporting(false);
    }
  }, "Failed to import Fitbit backup");

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      void handleFileImport(file).catch(() => {
        // The error has already been reported by the toaster.
      });
    }
  };

  const handleSkip = () => {
    clearFitbitAuthToken();
    showSuccessToast("Skipping settings import");
    router.replace("/");
  };

  const handleDontImport = async () => {
    const { confirmed } = await confirm({
      description: "This will delete your old settings. Are you sure?",
    });

    if (!confirmed) {
      return;
    }

    clearMigrationBackupStorage();
    clearFitbitAuthToken();
    setHasMigrationBackup(false);
    showSuccessToast("Old settings deleted");
    router.replace("/");
  };

  return (
    <Paper className="flex flex-col gap-4 p-6">
      <Typography variant="h5" component="h1">
        Welcome back!
      </Typography>
      <Typography>
        This website is now using the Google Health API to access your health
        data, instead of the Fitbit API which is no longer available. Most of
        the experience should be the same, but here are some things you should
        know:
      </Typography>
      <ul className="list-disc list-outside pl-4">
        <li>
          Previously, once you signed in with your Fitbit account, you could
          stay signed in indefinitely. Now, you&apos;ll be asked to sign in
          again every 3 days. This may be adjustable in the future.
        </li>
        <li>
          Dashboard layout and other settings are now stored in Google Drive,
          instead of inside your browser. This means when you sign in from
          another computer, you&apos; be able to sync your settings.
        </li>
        <li>
          If you previously backed up your settings, you will need to import
          them into Google Drive using the button below.
        </li>
        <li>
          Previously, we would get your daily steps/distance/calorie goals from
          the Fitbit API. This is not yet available in the Google Health API, so
          to view them on the dashboard you&apos;ll need to set them manually
          (or if you import your settings, it will be carried over from the
          backup). In the future, we should be able to get these goals from the
          Google Health API.
        </li>
        <li>
          Custom foods are no longer synced with the Google Health app. If you
          previously backed up your custom foods, they will be available as food
          templates, which are only available on this website and not in the
          Google Health app.
        </li>
        <li>
          Only logs created from the dashboard can be edited or deleted. If you
          log something from another app (including the Google Health app) you
          will only be able to view it.
        </li>
      </ul>
      <Typography>
        If you have any questions, please feel free to reach out (see the{" "}
        <Link href="/about" className="underline">
          About page
        </Link>
        ).
      </Typography>
      {!driveEnabled && (
        <Alert severity="info">
          Google Drive access is not enabled. You must enable Google Drive to
          import your settings. This will only allow us to store your settings
          in Google Drive; it will not have access any of your Google Drive
          files.
        </Alert>
      )}
      {!hasMigrationBackup && (
        <Typography>
          You can import a Fitbit migration JSON backup. This replaces your
          current food templates, meals, and goals. Dashboard tiles saved in
          this browser will also replace your current dashboard tiles; other
          settings are unchanged.
        </Typography>
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
        {hasMigrationBackup && (
          <Button
            variant="contained"
            onClick={() => void handleImport()}
            disabled={importing || !driveEnabled}
          >
            {importing ? "Importing…" : "Import old settings"}
          </Button>
        )}
        {!hasMigrationBackup && (
          <Button
            component="label"
            variant="contained"
            disabled={importing || !driveEnabled}
          >
            {importing ? "Importing…" : "Import from JSON file"}
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleFileChange}
              disabled={importing || !driveEnabled}
            />
          </Button>
        )}
        <Button onClick={handleSkip} disabled={importing}>
          Skip import
        </Button>
        {hasMigrationBackup && (
          <Button
            className="ml-auto"
            color="error"
            onClick={() => void handleDontImport()}
            disabled={importing}
          >
            Don&apos;t import
          </Button>
        )}
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
