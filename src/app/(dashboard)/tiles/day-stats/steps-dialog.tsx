import {
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sumBy } from "lodash";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import { TIME } from "@/utils/date-formats";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useSelectedDay } from "../../state";

import {
  DailyGoalSummary,
  useDayAndWeekSummary,
  WeeklyGoalSummary,
} from "./goals";

export default function StepsDialogContent(props: RenderDialogContentProps) {
  const [currentTab, setCurrentTab] = useState("overview");

  return (
    <>
      <DialogTitle align="center">Steps</DialogTitle>
      <DialogContent>
        <TabContext value={currentTab}>
          <TabList onChange={(event, value) => setCurrentTab(value)}>
            <Tab label="Overview" value="overview" />
            {ENABLE_INTRADAY && <Tab label="Detailed" value="intraday" />}
          </TabList>
          <TabPanel value="overview">
            <Overview />
          </TabPanel>
          {ENABLE_INTRADAY && (
            <TabPanel value="intraday">
              <StepsIntraday />
            </TabPanel>
          )}
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
  } = useDayAndWeekSummary("steps");

  const currentTotal = summary.steps;
  const dailyGoal = goals?.steps ?? 0;

  const weeklySteps = sumBy(weekData, (entry) => Number(entry.value));
  const weeklyGoal = weeklyGoals.steps;

  return (
    <Stack direction="row" justifyContent="center">
      <DailyGoalSummary
        currentTotal={currentTotal}
        dailyGoal={dailyGoal}
        unit="steps"
      />
      <WeeklyGoalSummary
        currentTotal={weeklySteps}
        weeklyGoal={weeklyGoal}
        unit="steps"
      />
    </Stack>
  );
}

function StepsIntraday() {
  const day = useSelectedDay();
  const startTime = day.startOf("day");
  const endTime = day.endOf("day");

  const { data } = useQuery(
    buildActivityIntradayQuery("steps", "15min", startTime, endTime)
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
      yAxis={[{ label: "Steps" }]}
      series={[
        {
          dataKey: "value",
          label: "Steps",
          valueFormatter: (value) =>
            value || value === 0 ? FRACTION_DIGITS_0.format(value) : "",
        },
      ]}
    />
  );
}
