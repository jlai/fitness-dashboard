"use client";

import { Box, Paper, Tab, Tabs } from "@mui/material";
import Link from "next/link";
import {
  DirectionsRun as ActivitesIcon,
  SingleBed as SleepIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";

import RequireLogin from "@/components/require-login";

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname().split("/")[2];

  return (
    <RequireLogin>
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs aria-label="history tabs" value={pathname}>
            <Tab
              component={Link}
              href="/history/activities"
              value="activities"
              label="Activities"
              icon={<ActivitesIcon />}
              iconPosition="start"
            />
            <Tab
              component={Link}
              href="/history/sleep"
              value="sleep"
              label="Sleep"
              icon={<SleepIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Box>
        {children}
      </Paper>
    </RequireLogin>
  );
}
