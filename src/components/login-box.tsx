"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
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

import { redirectToLogin } from "@/api/auth";
import { PRIVACY_POLICY_LINK, WEBSITE_NAME } from "@/config";

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
        <PermissionInfo title="Activity">
          Display steps, activities, calories burned, and other stats, and log
          manual activities.
        </PermissionInfo>
        <PermissionInfo title="Heart Rate">
          Display resting heart rate and heart rate zone graphs.
        </PermissionInfo>
        <PermissionInfo title="Location">
          Display maps of GPS-tracked activity logs.
        </PermissionInfo>
        <PermissionInfo title="Nutrition">
          Display and log food and water consumption and goals.
        </PermissionInfo>
        <PermissionInfo title="Profile">
          Get distance/weight/water unit settings. If you turn off this
          permission, go to the{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          page to manually set your units.
        </PermissionInfo>
        <PermissionInfo title="Settings">
          Display last sync time and battery status.
        </PermissionInfo>
        <PermissionInfo title="Sleep">
          Display sleep logs and manually log sleep.
        </PermissionInfo>
        <PermissionInfo title="Weight">
          Display weight history and manually log weight.
        </PermissionInfo>
      </TableBody>
    </Table>
  );
}

export default function LoginBox() {
  const login = useCallback(() => {
    redirectToLogin();
  }, []);

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
          Connect your Fitbit account
        </Typography>
        <div className="space-y-4">
          <Typography variant="body1">
            Connect your Fitbit account to view your daily stats, historical
            graphs and logs, and log new activities and other data.
          </Typography>
          <Typography variant="body1">
            No health or personal information will be shared with the operators
            of this website or any third party. Data retrieved from the Fitbit
            Web API will be stored solely in your browser&apos;s memory and
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
                  if you change your mind, or completely remove access using
                  Fitbit&apos;s{" "}
                  <a
                    href="https://www.fitbit.com/settings/applications"
                    target="_blank"
                    className="underline"
                  >
                    linked apps
                  </a>{" "}
                  page.
                </p>
                <PermissionsTable />
              </div>
            </AccordionDetails>
          </Accordion>
        </div>
        <div className="mt-8 flex flex-col items-center">
          <Button variant="contained" onClick={login}>
            Connect with Fitbit
          </Button>
        </div>
      </section>
    </Container>
  );
}
