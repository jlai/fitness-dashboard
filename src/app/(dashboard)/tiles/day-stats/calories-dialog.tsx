import {
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Typography,
} from "@mui/material";
import { LineChart, PieChart, PieValueType } from "@mui/x-charts";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useAtomValue } from "jotai";

import { NumberFormats } from "@/utils/number-formats";
import { buildActivityIntradayQuery } from "@/api/intraday";
import { FormRows } from "@/components/forms/form-row";
import { caloriesOutGoalAtom } from "@/storage/settings";
import { buildGetExerciseByDateQuery } from "@/api/exercise/exercise";
import {
  getExerciseCalories,
  getExerciseDataPointId,
  getExerciseDisplayName,
  getExerciseFromDataPoint,
  getExerciseStartTime,
} from "@/api/exercise/helpers";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useDailySummary } from "../common";
import { useSelectedDay } from "../../state";
import { useTileSetting } from "../tile";

import { DailyGoalSummary, GoalSettings } from "./goals";

interface CaloriesTileSettings {
  defaultTab: string;
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export default function CaloriesDialogContent(props: RenderDialogContentProps) {
  const [currentTab, setCurrentTab] = useTileSetting<
    CaloriesTileSettings,
    "defaultTab"
  >("defaultTab", "overview");

  return (
    <>
      <DialogTitle align="center">Calories burned</DialogTitle>
      <DialogContent>
        <TabContext value={currentTab}>
          <TabList onChange={(event, value) => setCurrentTab(value)}>
            <Tab label="Overview" value="overview" />

            <Tab label="By activity" value="pie" />
            <Tab label="Burn rate" value="intraday" />
            <Tab label="Settings" value="settings" />
          </TabList>
          <TabPanel value="overview">
            <Suspense>
              <Overview />
            </Suspense>
          </TabPanel>
          <TabPanel value="pie">
            <Suspense>
              <CaloriesPieChart />
            </Suspense>
          </TabPanel>
          <TabPanel value="intraday">
            <Suspense>
              <CaloriesIntraday />
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
  const { summary } = useDailySummary();
  const dailyGoal = useAtomValue(caloriesOutGoalAtom);
  const currentTotal = summary.caloriesOut;

  return (
    <DailyGoalSummary
      currentTotal={currentTotal}
      dailyGoal={dailyGoal}
      unit="Calories"
    />
  );
}

function CaloriesPieChart() {
  const day = useSelectedDay();
  const {
    summary: { caloriesOut },
  } = useDailySummary();
  const { data: activities = [] } = useSuspenseQuery(
    buildGetExerciseByDateQuery(day)
  );

  let otherCalories = caloriesOut;

  const seriesData: Array<PieValueType> = [];

  for (const dataPoint of activities) {
    const exercise = getExerciseFromDataPoint(dataPoint);
    const calories = getExerciseCalories(exercise);
    const startTime = getExerciseStartTime(exercise);
    const time = startTime ? new Date(startTime) : undefined;

    seriesData.push({
      id: getExerciseDataPointId(dataPoint),
      value: calories,
      label: `${getExerciseDisplayName(exercise)}${
        time ? ` at ${timeFormat.format(time)}` : ""
      }`,
    });

    otherCalories -= calories;
  }

  if (otherCalories > 0) {
    seriesData.push({
      id: "other",
      value: otherCalories,
      label: "Other",
      color: "#a9b3c4",
    });
  }

  return (
    <PieChart
      width={500}
      height={200}
      series={[
        {
          data: seriesData,
          paddingAngle: 0.5,
          cornerRadius: 8,
          innerRadius: 30,
          outerRadius: 80,
          cx: 100,
          valueFormatter: ({ value }) =>
            `${NumberFormats.FRACTION_DIGITS_0.format(value)} Cal`,
        },
      ]}
    />
  );
}

function CaloriesIntraday() {
  const day = useSelectedDay();
  const startTime = day.startOf("day");
  const endTime = day.endOf("day");

  const { data } = useQuery(
    buildActivityIntradayQuery("calories", "5min", startTime, endTime),
  );

  const processedData = data?.map((entry) => ({
    dateTime: entry.dateTime,
    value: entry.value / 5,
  }));

  return (
    <LineChart
      grid={{ horizontal: true }}
      height={300}
      loading={!data}
      dataset={processedData ?? []}
      xAxis={[{ dataKey: "dateTime", scaleType: "time" }]}
      yAxis={[{ label: "Cal/min" }]}
      series={[{ dataKey: "value", showMark: false, label: "Calories/minute" }]}
    />
  );
}

function Settings() {
  return (
    <>
      <Typography variant="h6">Goals</Typography>
      <Typography variant="body1">Set daily and weekly calories burned goals.</Typography>

      <FormRows mt={4}>
        <GoalSettings
          resource="caloriesOut"
          period="daily"
          label="Daily calories burned goal"
          unit="Cal"
        />
        <GoalSettings
          resource="caloriesOut"
          period="weekly"
          label="Weekly calories burned goal"
          unit="Cal"
        />
      </FormRows>
    </>
  );
}
