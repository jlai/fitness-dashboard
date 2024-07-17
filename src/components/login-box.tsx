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
import { PRIVACY_POLICY_LINK } from "@/config";

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
          Display steps, activities, calories burned, and other stats.
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
        <PermissionInfo title="Sleep">Display sleep logs.</PermissionInfo>
        <PermissionInfo title="Weight">Display weight history.</PermissionInfo>
      </TableBody>
    </Table>
  );
}

export default function LoginBox() {
  const login = useCallback(() => {
    redirectToLogin();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h3" marginBottom="24px">
        Connect your Fitbit account
      </Typography>
      <div className="space-y-4">
        <Typography variant="body1">
          Connect your Fitbit account to display your daily stats on this
          website.
        </Typography>
        <Typography variant="body1">
          No health or personal information will be shared with the operators of
          this website or any third party. Data retrieved from the Fitbit Web
          API will be stored solely in your browser&apos;s memory and offline
          storage/cache.{" "}
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
                displayed if you turn off certain permissions. You can add or
                remove permissions later if you change your mind.
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
    </Container>
  );
}
