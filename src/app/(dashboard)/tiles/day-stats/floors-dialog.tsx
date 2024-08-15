import {
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sumBy } from "lodash";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import { TIME } from "@/utils/date-formats";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";
import { FormRows } from "@/components/forms/form-row";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useSelectedDay } from "../../state";
import { useTileSetting } from "../tile";

import {
  DailyGoalSummary,
  GoalSettings,
  useDayAndWeekSummary,
  WeeklyGoalSummary,
} from "./goals";

interface FloorsTileSettings {
  defaultTab: string;
}

export default function FloorsDialogContent(props: RenderDialogContentProps) {
  const [currentTab, setCurrentTab] = useTileSetting<
    FloorsTileSettings,
    "defaultTab"
  >("defaultTab", "overview");

  return (
    <>
      <DialogTitle align="center">Floors</DialogTitle>
      <DialogContent>
        <TabContext value={currentTab}>
          <TabList onChange={(event, value) => setCurrentTab(value)}>
            <Tab label="Overview" value="overview" />
            {ENABLE_INTRADAY && <Tab label="Detailed" value="intraday" />}
            <Tab label="Settings" value="settings" />
          </TabList>
          <TabPanel value="overview">
            <Suspense>
              <Overview />
            </Suspense>
          </TabPanel>
          {ENABLE_INTRADAY && (
            <TabPanel value="intraday">
              <Suspense>
                <FloorsIntraday />
              </Suspense>
            </TabPanel>
          )}
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
  const {
    daySummary: { summary, goals },
    weeklyGoals,
    weekData,
  } = useDayAndWeekSummary("floors");

  const currentTotal = summary.floors;
  const dailyGoal = goals?.floors ?? 0;

  const weeklyTotal = sumBy(weekData, (entry) => Number(entry.value));
  const weeklyGoal = weeklyGoals.floors;

  return (
    <Stack direction="row" justifyContent="center">
      <DailyGoalSummary
        currentTotal={currentTotal}
        dailyGoal={dailyGoal}
        unit="floors"
      />
      <WeeklyGoalSummary
        currentTotal={weeklyTotal}
        weeklyGoal={weeklyGoal}
        unit="floors"
      />
    </Stack>
  );
}

function FloorsIntraday() {
  const day = useSelectedDay();
  const startTime = day.startOf("day");
  const endTime = day.endOf("day");

  const { data } = useQuery(
    buildActivityIntradayQuery("floors", "15min", startTime, endTime)
  );

  const processedData = useMemo(
    () => (data ? aggregateByHour(data) : data),
    [data]
  );

  return (
    <BarChart
      grid={{ horizontal: true }}
      height={300}
      loading={!data}
      dataset={processedData ?? []}
      xAxis={[
        { dataKey: "dateTime", scaleType: "band", valueFormatter: TIME.format },
      ]}
      yAxis={[{ label: "Floors" }]}
      series={[
        {
          dataKey: "value",
          label: "Floors",
          valueFormatter: (value) =>
            value || value === 0 ? FRACTION_DIGITS_0.format(value) : "",
        },
      ]}
    />
  );
}

function Settings() {
  return (
    <>
      <Typography variant="h6">Goals</Typography>
      <Typography variant="body1">
        Set daily and weekly goals. Weekly goals are only shown in the Overview
        tab here.
      </Typography>

      <FormRows mt={4}>
        <GoalSettings
          resource="floors"
          period="daily"
          label="Daily floors goal"
          unit="floors"
        />
        <GoalSettings
          resource="floors"
          period="weekly"
          label="Weekly floors goal"
          unit="floors"
        />
      </FormRows>
    </>
  );
}
