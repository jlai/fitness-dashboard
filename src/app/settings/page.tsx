"use client";

import {
  Button,
  Chip,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  revokeAuthorization,
  DEFAULT_STAY_LOGGED_IN_MINUTES,
  getStayLoggedInMinutes,
  setStayLoggedInMinutes,
  STAY_LOGGED_IN_DURATION_OPTIONS,
  type StayLoggedInMinutes,
  useAccessTokenScopes,
  useDriveAuthEnabled,
  useLoggedIn,
  useOpenIdSignedIn,
} from "@/api/auth";
import { useSignOut } from "@/components/login/use-sign-out";
import { useEnableGoogleDriveSettings } from "@/storage/settings-storage";
import { getScopeName } from "@/config/scopes";

import { SettingsRow, SettingsTable } from "./common";

function LoginSettings() {
  const loggedIn = useLoggedIn();

  return loggedIn ? <LoggedInAccountSettings /> : <LoggedOutAccountSettings />;
}

function StayLoggedInSettings() {
  const [sessionLifetimeMinutes, setSessionLifetimeMinutes] =
    useState<StayLoggedInMinutes>(DEFAULT_STAY_LOGGED_IN_MINUTES);

  useEffect(() => {
    setSessionLifetimeMinutes(getStayLoggedInMinutes());
  }, []);

  const updateSessionLifetime = (event: SelectChangeEvent<number>) => {
    const option = STAY_LOGGED_IN_DURATION_OPTIONS.find(
      (item) => item.minutes === Number(event.target.value),
    );

    if (option) {
      setSessionLifetimeMinutes(option.minutes);
      setStayLoggedInMinutes(option.minutes);
    }
  };

  return (
    <SettingsRow
      title="Remember me duration"
      action={
        <Select
          SelectDisplayProps={{ "aria-label": "Remember me duration" }}
          value={sessionLifetimeMinutes}
          onChange={updateSessionLifetime}
        >
          {STAY_LOGGED_IN_DURATION_OPTIONS.map((option) => (
            <MenuItem key={option.minutes} value={option.minutes}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      }
    >
      This setting will take effect the next time you sign in; it will not
      change your current session.
    </SettingsRow>
  );
}

function LoggedOutAccountSettings() {
  const openIdSignedIn = useOpenIdSignedIn();
  const handleLogout = useSignOut();

  return (
    <SettingsRow
      title="Google account"
      action={
        openIdSignedIn ? (
          <Button onClick={handleLogout}>Sign out</Button>
        ) : (
          <Button component={Link} href="/">
            Sign in
          </Button>
        )
      }
    >
      {openIdSignedIn
        ? "You're signed in with Google. Grant access to Google Health from the home page to continue."
        : "You're not currently logged in."}
    </SettingsRow>
  );
}

function LoggedInAccountSettings() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const scopes = useAccessTokenScopes();
  const handleLogout = useSignOut();
  const driveEnabled = useDriveAuthEnabled();
  const { enableGoogleDriveSettings, ready: driveAuthReady } =
    useEnableGoogleDriveSettings();

  const unlinkAccount = () => {
    confirm({
      title: "Unlink account",
      description:
        "Sign out and unlink this website from your Google account? This will sign you out of any other browser sessions as well.",
    }).then(async ({ confirmed }) => {
      if (confirmed) {
        await revokeAuthorization();
        queryClient.clear();
        router.replace("/");
      }
    });
  };

  return (
    <>
      <SettingsRow
        title="Google account"
        action={<Button onClick={handleLogout}>Sign out</Button>}
      >
        You&apos;re currently logged in
      </SettingsRow>
      {scopes && scopes.size > 0 && (
        <SettingsRow title="Granted permissions" component="div">
          <div>
            These are the permissions that this website is allowed to access
            from your Google Health account. To remove permissions, unlink your
            account and sign in again.
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {[...scopes]
              .sort((a, b) => getScopeName(a).localeCompare(getScopeName(b)))
              .map((scope) => (
                <Chip key={scope} label={getScopeName(scope)} size="small" />
              ))}
          </div>
        </SettingsRow>
      )}
      {!driveEnabled && (
        <SettingsRow
          title="Save settings to Google Drive"
          action={
            <Button
              onClick={() => void enableGoogleDriveSettings()}
              disabled={!driveAuthReady}
            >
              Enable
            </Button>
          }
          component="div"
        >
          <div className="space-y-4">
            <p>
              Allow this website to store settings in your Google Drive. This
              allows you to customize your dashboard and have the settings
              backed up to the cloud. See the{" "}
              <Link href="/about" className="underline">
                FAQ
              </Link>{" "}
              for more details.
            </p>
          </div>
        </SettingsRow>
      )}
      <SettingsRow
        title="Unlink Google account"
        action={
          <Button color="error" onClick={unlinkAccount}>
            Unlink
          </Button>
        }
      >
        Unlink this website from your Google account and remove all permissions.
        Signs out of all browser sessions as well. You will need to sign in
        again to use the website.
      </SettingsRow>
    </>
  );
}

export default function SettingsPage() {
  return (
    <SettingsTable>
      <LoginSettings />
      <StayLoggedInSettings />
    </SettingsTable>
  );
}
