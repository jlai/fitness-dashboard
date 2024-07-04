"use client";

import { Suspense, useState } from "react";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Paper, Tab } from "@mui/material";
import {
  DirectionsRun as ActivitesIcon,
  SingleBed as SleepIcon,
} from "@mui/icons-material";

import RequireLogin from "@/components/require-login";
import { RequireScopes } from "@/components/require-scopes";

import ActivityLog from "./activity-log";
import SleepLog from "./sleep-log";

export default function HistoryPage() {
  const [currentTab, setCurrentTab] = useState("activities");

  return (
    <RequireLogin>
      <Paper>
        <TabContext value={currentTab}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <TabList
              onChange={(event, value) => setCurrentTab(value)}
              aria-label="history tab"
            >
              <Tab
                label="Activities"
                icon={<ActivitesIcon />}
                iconPosition="start"
                value="activities"
              />
              <Tab
                label="Sleep"
                icon={<SleepIcon />}
                iconPosition="start"
                value="sleep"
              />
            </TabList>
          </Box>
          <TabPanel value="activities">
            <Suspense>
              <RequireScopes scopes={["pro", "act"]}>
                <ActivityLog />
              </RequireScopes>
            </Suspense>
          </TabPanel>
          <TabPanel value="sleep">
            <Suspense>
              <RequireScopes scopes={["pro", "sle"]}>
                <SleepLog />
              </RequireScopes>
            </Suspense>
          </TabPanel>
        </TabContext>
      </Paper>
    </RequireLogin>
  );
}
