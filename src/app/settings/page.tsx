"use client";

import React from "react";
import { Button, Chip } from "@mui/material";
import { useConfirm } from "material-ui-confirm";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  revokeAuthorization,
  useAccessTokenScopes,
  useDriveAuthEnabled,
  useLoggedIn,
  useGoogleLoginAndAuthorization,
  useOpenIdSignedIn,
} from "@/api/auth";
import { GoogleSignInButton } from "@/components/login/google-sign-in-button";
import { useSignOut } from "@/components/login/use-sign-out";
import {
  useDisableGoogleDriveSettings,
  useEnableGoogleDriveSettings,
} from "@/storage/settings-storage";
import { getScopeName } from "@/config/scopes";

import { SettingsRow, SettingsTable } from "./common";

function LoginSettings() {
  const loggedIn = useLoggedIn();

  return loggedIn ? <LoggedInAccountSettings /> : <LoggedOutAccountSettings />;
}

function LoggedOutAccountSettings() {
  const openIdSignedIn = useOpenIdSignedIn();
  const { loginToGoogleAndAuthorize, ready } = useGoogleLoginAndAuthorization();
  const handleLogout = useSignOut();

  return (
    <>
      <SettingsRow
        title="Google account"
        action={
          openIdSignedIn ? (
            <Button onClick={handleLogout}>Sign out</Button>
          ) : (
            <GoogleSignInButton />
          )
        }
      >
        {openIdSignedIn
          ? "You're signed in with Google. Grant access to Google Health to continue."
          : "You're not currently logged in."}
      </SettingsRow>
      {openIdSignedIn && (
        <SettingsRow
          title="Google Health access"
          action={
            <Button
              onClick={() => loginToGoogleAndAuthorize()}
              disabled={!ready}
            >
              Grant Health access
            </Button>
          }
        >
          Connect Google Health to view your fitness data on this site.
        </SettingsRow>
      )}
    </>
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
  const { disableGoogleDriveSettings } = useDisableGoogleDriveSettings();

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
      <SettingsRow
        title="Save settings to Google Drive"
        action={
          driveEnabled ? (
            <Button
              color="error"
              onClick={() => void disableGoogleDriveSettings()}
            >
              Disable
            </Button>
          ) : (
            <Button
              onClick={() => void enableGoogleDriveSettings()}
              disabled={!driveAuthReady}
            >
              Enable
            </Button>
          )
        }
        component="div"
      >
        <div className="space-y-4">
          <p>
            Allow this website to store settings in your Google Drive. This
            allows you to customize your dashboard and have the settings backed
            up to the cloud. See the{" "}
            <Link href="/about" className="underline">
              FAQ
            </Link>{" "}
            for more details.
          </p>
        </div>
      </SettingsRow>
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
    </SettingsTable>
  );
}
