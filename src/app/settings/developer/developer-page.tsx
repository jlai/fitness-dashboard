"use client";

import React, { FormEvent, useLayoutEffect, useState } from "react";
import { Button, Tab, TextField } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useAtomValue } from "jotai";
import { toast } from "mui-sonner";
import type { ZodType } from "zod";

import {
  createSession,
  forceTokenRefresh,
  restoreAccessToken,
  restoreDriveAccessToken,
  saveEncryptedAuthTokens,
  useLoggedIn,
} from "@/api/auth";
import {
  getGoogleIdTokenCallback,
  setGoogleIdTokenCallback,
} from "@/api/google-identity";
import { GoogleSignInButton } from "@/components/login/google-sign-in-button";
import { useSwitchAccounts } from "@/components/login/use-switch-accounts";
import { showSuccessToast, withErrorToaster } from "@/components/toast";
import {
  SETTINGS_STORAGE_KEYS,
  settingsStorageAtom,
  settingsStorageEpochAtom,
  type SettingsStorage,
  type SettingsStorageKey,
  type StoredData,
} from "@/storage/settings-storage";
import {
  clientOnlyFavoriteFoodsStoredSchema,
  clientOnlyFoodsStoredSchema,
  clientOnlyGoalsStoredSchema,
  dashboardsStoredSchema,
  mealsStoredSchema,
  settingsStoredSchema,
} from "@/storage/settings-storage/schemas";
import {
  migrateClientOnlyFoodsData,
  migrateMealsStoredData,
} from "@/storage/settings-storage/migrations";
import { isStoredDataEnvelope } from "@/storage/settings-storage/types";

import { SettingsRow, SettingsTable } from "../common";

const settingsStorageKeys = Object.values(SETTINGS_STORAGE_KEYS);

type BlobMigration = (
  stored: StoredData<unknown>,
  storage: SettingsStorage,
) => StoredData<unknown> | Promise<StoredData<unknown>>;

const settingsBlobDefinitions: Record<
  SettingsStorageKey,
  {
    schema: ZodType<StoredData<unknown>>;
    version: number;
    migrate?: BlobMigration;
  }
> = {
  [SETTINGS_STORAGE_KEYS.dashboards]: {
    schema: dashboardsStoredSchema,
    version: 1,
  },
  [SETTINGS_STORAGE_KEYS.clientOnlyGoals]: {
    schema: clientOnlyGoalsStoredSchema,
    version: 1,
  },
  [SETTINGS_STORAGE_KEYS.meals]: {
    schema: mealsStoredSchema,
    version: 2,
    migrate: migrateMealsStoredData,
  },
  [SETTINGS_STORAGE_KEYS.clientOnlyFoods]: {
    schema: clientOnlyFoodsStoredSchema,
    version: 2,
    migrate: migrateClientOnlyFoodsData,
  },
  [SETTINGS_STORAGE_KEYS.clientOnlyFavoriteFoods]: {
    schema: clientOnlyFavoriteFoodsStoredSchema,
    version: 1,
  },
  [SETTINGS_STORAGE_KEYS.settings]: {
    schema: settingsStoredSchema,
    version: 1,
  },
};

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

function StoredSettingsBlobs() {
  const storage = useAtomValue(settingsStorageAtom);
  const storageEpoch = useAtomValue(settingsStorageEpochAtom);
  const [currentTab, setCurrentTab] = useState<SettingsStorageKey>(
    settingsStorageKeys[0],
  );
  const [blobs, setBlobs] = useState<
    Partial<Record<SettingsStorageKey, StoredData<unknown> | null>>
  >({});
  const [drafts, setDrafts] = useState<
    Partial<Record<SettingsStorageKey, string>>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(undefined);

    Promise.all(
      settingsStorageKeys.map(
        async (key) => [key, await storage.get(key)] as const,
      ),
    )
      .then((entries) => {
        if (active) {
          setBlobs(Object.fromEntries(entries));
          setDrafts(
            Object.fromEntries(
              entries
                .filter(
                  (
                    entry,
                  ): entry is readonly [
                    SettingsStorageKey,
                    StoredData<unknown>,
                  ] => entry[1] !== null,
                )
                .map(([key, blob]) => [key, JSON.stringify(blob, null, 2)]),
            ),
          );
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        setLoadError(message);
        toast.error(`Failed to load stored settings: ${message}`);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [storage, storageEpoch]);

  const handleUpdate = async () => {
    const key = currentTab;
    const definition = settingsBlobDefinitions[key];
    setSaving(true);

    try {
      const parsedJson: unknown = JSON.parse(drafts[key] ?? "");
      if (!isStoredDataEnvelope(parsedJson)) {
        throw new Error("The value must be a stored settings envelope.");
      }

      if (parsedJson.version > definition.version) {
        throw new Error(
          `Version ${parsedJson.version} is newer than the supported version ${definition.version}.`,
        );
      }

      let candidate: StoredData<unknown> = parsedJson;
      if (candidate.version < definition.version) {
        if (!definition.migrate) {
          throw new Error(
            `No migration is available from version ${candidate.version}.`,
          );
        }
        candidate = await definition.migrate(candidate, storage);
      }

      const validated = definition.schema.safeParse(candidate);
      if (!validated.success) {
        const details = validated.error.issues
          .map((issue) => `${issue.path.join(".") || "blob"}: ${issue.message}`)
          .join("; ");
        throw new Error(`Schema validation failed: ${details}`);
      }

      const updated = await storage.set(
        key,
        validated.data.data,
        definition.version,
      );
      setBlobs((previous) => ({ ...previous, [key]: updated }));
      setDrafts((previous) => ({
        ...previous,
        [key]: JSON.stringify(updated, null, 2),
      }));
      showSuccessToast(`Updated stored settings: ${key}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to update stored settings: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsTable>
      <SettingsRow title="Stored settings blobs" component="div">
        View the raw stored data for each settings key.
        <TabContext value={currentTab}>
          <TabList
            aria-label="Stored settings keys"
            onChange={(_, value: SettingsStorageKey) => setCurrentTab(value)}
          >
            {settingsStorageKeys.map((key) => (
              <Tab
                key={key}
                label={key}
                value={key}
                disabled={saving}
                sx={{ textTransform: "none" }}
              />
            ))}
          </TabList>
          {settingsStorageKeys.map((key) => (
            <TabPanel key={key} value={key}>
              {loading ? (
                "Loading..."
              ) : loadError ? (
                `Unable to load stored settings: ${loadError}`
              ) : blobs[key] ? (
                <>
                  <textarea
                    className="mt-2 h-[500px] w-full resize-y rounded border border-gray-300 bg-white p-3 font-mono text-sm"
                    aria-label={`Stored settings ${key}`}
                    value={drafts[key] ?? ""}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [key]: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      onClick={() => void handleUpdate()}
                      disabled={saving}
                    >
                      Update
                    </Button>
                  </div>
                </>
              ) : (
                "No stored data for this key."
              )}
            </TabPanel>
          ))}
        </TabContext>
      </SettingsRow>
    </SettingsTable>
  );
}

function DebugLoginForm() {
  const [idToken, setIdToken] = useState("");
  const [healthToken, setHealthToken] = useState("");
  const [driveToken, setDriveToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    const previousCallback = getGoogleIdTokenCallback();

    setGoogleIdTokenCallback((response) => {
      if (!response.credential) {
        toast.error("Unable to reach Google to sign in");
        return;
      }

      setIdToken(response.credential);
      showSuccessToast("OpenID token captured");
    });

    return () => {
      setGoogleIdTokenCallback(previousCallback);
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedIdToken = idToken.trim();
    const trimmedHealthToken = healthToken.trim();
    const trimmedDriveToken = driveToken.trim();

    if (!trimmedIdToken && !trimmedHealthToken && !trimmedDriveToken) {
      toast.error(
        "Failed to apply debug login: enter an OpenID, health, or drive token",
      );
      return;
    }

    setSubmitting(true);

    try {
      if (trimmedHealthToken || trimmedDriveToken) {
        saveEncryptedAuthTokens({
          encryptedHealthToken: trimmedHealthToken || undefined,
          encryptedDriveToken: trimmedDriveToken || undefined,
        });
      }

      if (trimmedIdToken) {
        await createSession(trimmedIdToken);
      } else {
        await restoreAccessToken();
        await restoreDriveAccessToken();
      }

      showSuccessToast("Debug login applied");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Failed to apply debug login: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <SettingsTable>
        <SettingsRow title="Debug login"></SettingsRow>
        <SettingsRow title="OpenID token" component="div">
          Google OpenID Connect ID token. Submitted to POST /auth/session to
          create a site session. Sign in with Google fills this field only; it
          does not create a session or request Health access.
          <div className="mt-2">
            <GoogleSignInButton />
          </div>
          <TextField
            className="mt-2"
            name="openid-token"
            fullWidth
            multiline
            minRows={3}
            value={idToken}
            onChange={(event) => setIdToken(event.target.value)}
            slotProps={{
              htmlInput: {
                "aria-label": "OpenID token",
                autoComplete: "off",
                spellCheck: false,
              },
            }}
          />
        </SettingsRow>
        <SettingsRow title="Health token" component="div">
          Encrypted Google Health refresh token stored for this browser.
          <TextField
            className="mt-2"
            name="health-token"
            fullWidth
            multiline
            minRows={3}
            value={healthToken}
            onChange={(event) => setHealthToken(event.target.value)}
            slotProps={{
              htmlInput: {
                "aria-label": "Health token",
                autoComplete: "off",
                spellCheck: false,
              },
            }}
          />
        </SettingsRow>
        <SettingsRow title="Drive token" component="div">
          Encrypted Google Drive refresh token stored for this browser.
          <TextField
            className="mt-2"
            name="drive-token"
            fullWidth
            multiline
            minRows={3}
            value={driveToken}
            onChange={(event) => setDriveToken(event.target.value)}
            slotProps={{
              htmlInput: {
                "aria-label": "Drive token",
                autoComplete: "off",
                spellCheck: false,
              },
            }}
          />
        </SettingsRow>
        <SettingsRow
          title="Apply tokens"
          action={
            <Button type="submit" disabled={submitting}>
              Log in
            </Button>
          }
        >
          Create a session from the OpenID token and save health/drive tokens
          locally.
        </SettingsRow>
      </SettingsTable>
    </form>
  );
}

export default function DeveloperSettingsPage() {
  return (
    <>
      <SettingsTable>
        <DeveloperSettings />
      </SettingsTable>
      <React.Suspense
        fallback={
          <SettingsTable>
            <SettingsRow title="Stored settings blobs">Loading...</SettingsRow>
          </SettingsTable>
        }
      >
        <StoredSettingsBlobs />
      </React.Suspense>
      <DebugLoginForm />
    </>
  );
}
