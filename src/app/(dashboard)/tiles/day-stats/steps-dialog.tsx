import {
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dropWhile, sumBy } from "lodash";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import { TIME } from "@/utils/date-formats";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";
import { HeaderBar } from "@/components/layout/rows";
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
import { IntradayIntervalSelect } from "./aggregation";

interface StepsTileSettings {
  defaultTab: string;
  interval: "15min" | "hour";
  trim: boolean;
}

export default function StepsDialogContent(props: RenderDialogContentProps) {
  const [currentTab, setCurrentTab] = useTileSetting<
    StepsTileSettings,
    "defaultTab"
  >("defaultTab", "overview");

  return (
    <>
      <DialogTitle align="center">Steps</DialogTitle>
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
                <StepsIntraday />
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
  const [interval, setInterval] = useTileSetting<StepsTileSettings, "interval">(
    "interval",
    "hour"
  );
  const [trim, setTrim] = useTileSetting<StepsTileSettings, "trim">(
    "trim",
    false
  );

  const { data } = useQuery(
    buildActivityIntradayQuery("steps", "15min", startTime, endTime)
  );

  const processedData = useMemo(() => {
    let processed = data;

    if (!data) {
      return data;
    }

    if (interval === "hour") {
      processed = aggregateByHour(data);
    }

    if (trim) {
      processed = dropWhile(processed, (data) => !data.value);
    }

    return processed;
  }, [data, interval, trim]);

  return (
    <>
      <HeaderBar justifyContent="end">
        <FormControlLabel
          control={
            <Checkbox
              checked={trim}
              onChange={(event, checked) => setTrim(checked)}
            />
          }
          label="Skip start of day"
        />
        <IntradayIntervalSelect value={interval} onChange={setInterval} />
      </HeaderBar>
      <BarChart
        grid={{ horizontal: true }}
        height={300}
        loading={!data}
        dataset={processedData ?? []}
        xAxis={[
          {
            dataKey: "dateTime",
            scaleType: "band",
            valueFormatter: TIME.format,
          },
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
    </>
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
          resource="steps"
          period="daily"
          label="Daily step goal"
          unit="steps"
        />
        <GoalSettings
          resource="steps"
          period="weekly"
          label="Weekly step goal"
          unit="steps"
        />
      </FormRows>
    </>
  );
}
