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
          Display and log food and water consumption.
        </PermissionInfo>
        <PermissionInfo title="Profile">
          Used to determine account age so we know how far back to fetch data.
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
  const { loginToGoogleAndAuthorize, ready } = useGoogleLoginAndAuthorization();

  const login = useCallback(() => {
    loginToGoogleAndAuthorize()
      .then(() => {
        if (!firstLoginDate) {
          setFirstLoginDate(formatAsDate(dayjs()));
        }

        if (!hasTokenScope(SETTINGS_READONLY) && !allUnitsConfigured) {
          router.replace("/settings");
        }
      })
      .catch(() => {
        // loginToGoogleAndAuthorize already toasts on failure
      });
  }, [
    allUnitsConfigured,
    firstLoginDate,
    loginToGoogleAndAuthorize,
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
            This website lets you explore your Google Health (formerly Fitbit)
            exercise stats, log meals, view runs and other activities, and more.
            This is a free interface created by Google Health users, for Google
            Health users, and is not affiliated with Google LLC.{" "}
            <Link href="/about" className="underline">
              Learn more
            </Link>
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
            Sign in with your Google Account to view your daily stats from
            Google Health, historical graphs and logs, and log new activities
            and other data.
          </Typography>
          <Typography variant="body1">
            This works entirely in your browser. No signups, no data collection,
            no ads.{" "}
            {PRIVACY_POLICY_LINK && (
              <span>
                View our{" "}
                <Link
                  href={PRIVACY_POLICY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  privacy policy
                </Link>{" "}
                for more details.
              </span>
            )}
          </Typography>
          <Typography variant="body1">
            Ready to get started? Click the button below.
          </Typography>
        </div>
        <div className="my-8 flex flex-col items-center">
          <LoginButton onClick={login} disabled={!ready} />
        </div>
        <section>
          <Typography variant="h5" marginBottom="24px">
            Q&amp;A
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
                  <Link href="/settings" className="underline">
                    settings
                  </Link>{" "}
                  if you change your mind, or completely remove access on the
                  settings page or on your Google Account&apos;s{" "}
                  <a
                    href="https://myaccount.google.com/connections"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    linked apps
                  </a>{" "}
                  manager.
                </p>
                <PermissionsTable />
              </div>
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ArrowDropDown />}>
              How is my data stored?
            </AccordionSummary>
            <AccordionDetails>
              <div className="space-y-2">
                <p>
                  Health data is retrieved from the Google Health API. Some of
                  the data may be cached in your browser&apos;s memory and local
                  offline storage/cache. No data is stored on our servers/cloud.
                </p>
              </div>
            </AccordionDetails>
          </Accordion>
        </section>
      </section>
    </Container>
  );
}
