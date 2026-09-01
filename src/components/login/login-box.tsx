"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Container,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import Link from "next/link";
import { ArrowDropDown } from "@mui/icons-material";
import { useAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

import { hasTokenScope, useGoogleLoginAndAuthorization } from "@/api/auth";
import { PRIVACY_POLICY_LINK, WEBSITE_NAME } from "@/config";
import { SETTINGS_READONLY } from "@/config/google-health-scopes";
import { allUnitsConfiguredAtom } from "@/storage/settings";
import { firstLoginDateAtom } from "@/storage/analytics";
import { formatAsDate } from "@/api/datetime";

import { LoginButton } from "./login-button";

function PermissionInfo({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell>{title}</TableCell>
      <TableCell>{children}</TableCell>
    </TableRow>
  );
}

function PermissionsTable() {
  return (
    <Table size="small">
      <TableBody>
        <PermissionInfo title="Activity and fitness">
          Display steps, activities, calories burned, and other stats, and log
          manual activities.
        </PermissionInfo>
        <PermissionInfo title="Health metrics and measurements">
          Display and log weight, and display heart rate, breathing rate, skin
          temperature, and oxygen saturation graphs.
        </PermissionInfo>
        <PermissionInfo title="Location">
          Display maps of GPS-tracked activity logs.
        </PermissionInfo>
        <PermissionInfo title="Nutrition">
          Display and log food and water consumption and goals.
        </PermissionInfo>
        <PermissionInfo title="Profile">
          Display your account name.
        </PermissionInfo>
        <PermissionInfo title="Settings">
          Get distance/weight/water unit settings. If you turn off this
          permission, go to the{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          page to manually set your units.
        </PermissionInfo>
        <PermissionInfo title="Sleep">
          Display sleep logs and manually log sleep.
        </PermissionInfo>
      </TableBody>
    </Table>
  );
}

export default function LoginBox() {
  const router = useRouter();
  const allUnitsConfigured = useAtomValue(allUnitsConfiguredAtom);
  const [firstLoginDate, setFirstLoginDate] = useAtom(firstLoginDateAtom);
  const { googleLoginAndAuthorization, ready } =
    useGoogleLoginAndAuthorization();

  const login = useCallback(() => {
    googleLoginAndAuthorization()
      .then(() => {
        if (!firstLoginDate) {
          setFirstLoginDate(formatAsDate(dayjs()));
        }

        if (!hasTokenScope(SETTINGS_READONLY) && !allUnitsConfigured) {
          router.replace("/settings");
        }
      })
      .catch(() => {
        // googleLoginAndAuthorization already toasts on failure
      });
  }, [
    allUnitsConfigured,
    firstLoginDate,
    googleLoginAndAuthorization,
    router,
    setFirstLoginDate,
  ]);

  return (
    <Container maxWidth="md" className="space-y-6">
      <section>
        <Typography variant="h4" marginBottom="24px">
          Welcome to {WEBSITE_NAME}
        </Typography>
        <div className="space-y-4">
          <Typography variant="body1">
            This website lets you explore your Fitbit exercise stats, log meals,
            view runs and other activities, and more. This is a free interface
            created by Fitbit users, for Fitbit users, and is not affiliated
            with Fitbit or Google LLC.{" "}
            <a href="/about" className="underline">
              Learn more
            </a>
            .
          </Typography>
        </div>
      </section>
      <section>
        <Typography variant="h5" marginBottom="24px">
          Connect your Google account
        </Typography>
        <div className="space-y-4">
          <Typography variant="body1">
            Connect the Google account holding your Google Health data to view
            your daily stats, historical graphs and logs, and log new activities
            and other data.
          </Typography>
          <Typography variant="body1">
            No health or personal information will be shared with the operators
            of this website or any third party. Data retrieved from the Google
            Health API will be stored solely in your browser&apos;s memory and
            offline storage/cache.{" "}
            {PRIVACY_POLICY_LINK && (
              <span>
                View our{" "}
                <Link
                  href={PRIVACY_POLICY_LINK}
                  target="_blank"
                  className="underline"
                >
                  privacy policy
                </Link>{" "}
                for more details.
              </span>
            )}
          </Typography>
          <Accordion>
            <AccordionSummary expandIcon={<ArrowDropDown />}>
              How are permissions used?
            </AccordionSummary>
            <AccordionDetails>
              <div className="space-y-2">
                <p>
                  All permissions are optional, although some data may not be
                  displayed if you turn off certain permissions. You&apos;ll be
                  prompted to update your permissions if needed.
                </p>
                <p>
                  You can add or remove permissions later in the{" "}
                  <a href="/settings" className="underline">
                    settings
                  </a>{" "}
                  if you change your mind, or completely remove access on your
                  Google Account&apos;s{" "}
                  <a
                    href="https://myaccount.google.com/permissions"
                    target="_blank"
                    className="underline"
                  >
                    third-party apps
                  </a>{" "}
                  page.
                </p>
                <PermissionsTable />
              </div>
            </AccordionDetails>
          </Accordion>
        </div>
        <div className="mt-8 flex flex-col items-center">
          <LoginButton onClick={login} disabled={!ready} />
        </div>
      </section>
    </Container>
  );
}
