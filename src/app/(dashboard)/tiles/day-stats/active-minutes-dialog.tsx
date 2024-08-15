import {
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Suspense } from "react";

import { FormRows } from "@/components/forms/form-row";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useTileSetting } from "../tile";
import { useDailySummary } from "../common";

import { DailyGoalSummary, GoalSettings } from "./goals";

interface ActiveMinutesTileSettings {
  defaultTab: string;
}

export default function ActiveMinutesDialogContent(
  props: RenderDialogContentProps
) {
  const [currentTab, setCurrentTab] = useTileSetting<
    ActiveMinutesTileSettings,
    "defaultTab"
  >("defaultTab", "overview");

  return (
    <>
      <DialogTitle align="center">Active minutes</DialogTitle>
      <DialogContent>
        <TabContext value={currentTab}>
          <TabList onChange={(event, value) => setCurrentTab(value)}>
            <Tab label="Overview" value="overview" />
            <Tab label="Settings" value="settings" />
          </TabList>
          <TabPanel value="overview">
            <Suspense>
              <Overview />
            </Suspense>
          </TabPanel>
          <TabPanel value="settings">
            <Suspense>
              <Settings />
            </Suspense>
          </TabPanel>
        </TabContext>
      </DialogContent>
      <DialogActions>{props.closeButton}</DialogActions>
    </>
  );
}

function Overview() {
  const { summary, goals } = useDailySummary();

  const currentTotal =
    summary.fairlyActiveMinutes + summary.fairlyActiveMinutes;
  const dailyGoal = goals?.activeMinutes ?? 0;

  return (
    <>
      <Typography variant="body1" mb={4}>
        Active minutes are the number of minutes spent moderately or very
        active. This is different from Active Zone Minutes.
      </Typography>
      <Stack direction="row" justifyContent="center">
        <DailyGoalSummary
          currentTotal={currentTotal}
          dailyGoal={dailyGoal}
          unit="mins"
        />
      </Stack>
    </>
  );
}

function Settings() {
  return (
    <>
      <Typography variant="h6">Goals</Typography>
      <Typography variant="body1">Set daily active minute goal.</Typography>

      <FormRows mt={4}>
        <GoalSettings
          resource="activeMinutes"
          period="daily"
          label="Daily active minutes goal"
          unit="mins"
        />
      </FormRows>
    </>
  );
}
