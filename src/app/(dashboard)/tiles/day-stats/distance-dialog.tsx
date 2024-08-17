import {
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import {
  BarPlot,
  ChartsAxisHighlight,
  ChartsGrid,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  ResponsiveChartContainer,
} from "@mui/x-charts";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Suspense, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sumBy } from "es-toolkit";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import { TIME } from "@/utils/date-formats";
import { FRACTION_DIGITS_2 } from "@/utils/number-formats";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";
import { useUnits } from "@/config/units";
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

interface DistanceTileSettings {
  defaultTab: string;
}

export default function DistanceDialogContent(props: RenderDialogContentProps) {
  const [currentTab, setCurrentTab] = useTileSetting<
    DistanceTileSettings,
    "defaultTab"
  >("defaultTab", "overview");

  return (
    <>
      <DialogTitle align="center">Distance</DialogTitle>
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
                <DistanceIntraday />
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
    weeklyGoals: { distance: weeklyGoalLocalized },
    weekData,
  } = useDayAndWeekSummary("distance");
  const { localizedKilometers, localizedKilometersNameLong } = useUnits();

  const dailyDistanceKilometers =
    (summary.distances ?? []).find((entry) => entry.activity === "total")
      ?.distance ?? 0;

  const dailyDistance = localizedKilometers(dailyDistanceKilometers);
  const dailyGoal = localizedKilometers(goals?.distance ?? 0);

  const weeklyDistance = localizedKilometers(
    sumBy(weekData, (entry) => Number(entry.value))
  );

  return (
    <Stack direction="row" justifyContent="center">
      <DailyGoalSummary
        currentTotal={dailyDistance}
        dailyGoal={dailyGoal}
        unit={localizedKilometersNameLong}
      />
      <WeeklyGoalSummary
        currentTotal={weeklyDistance}
        weeklyGoal={weeklyGoalLocalized}
        unit={localizedKilometersNameLong}
      />
    </Stack>
  );
}

function DistanceIntraday() {
  const day = useSelectedDay();
  const startTime = day.startOf("day");
  const endTime = day.endOf("day");

  const { localizedKilometers, localizedKilometersName } = useUnits();

  const { data } = useQuery(
    buildActivityIntradayQuery("distance", "15min", startTime, endTime)
  );

  const processedData = useMemo(
    () =>
      data
        ? aggregateByHour(data).map((entry) => ({
            ...entry,
            localizedValue: localizedKilometers(entry.value),
          }))
        : data,
    [data, localizedKilometers]
  );

  return (
    <div>
      <ResponsiveChartContainer
        height={300}
        dataset={processedData ?? []}
        xAxis={[
          {
            dataKey: "dateTime",
            scaleType: "band",
            valueFormatter: TIME.format,
          },
        ]}
        yAxis={[
          {
            label: localizedKilometersName,
            valueFormatter: (value) => FRACTION_DIGITS_2.format(value),
          },
        ]}
        series={[
          {
            type: "bar",
            dataKey: "localizedValue",
            label: "Distance",
            valueFormatter: (value) =>
              value || value === 0
                ? `${FRACTION_DIGITS_2.format(
                    value
                  )} ${localizedKilometersName}`
                : "",
          },
        ]}
      >
        <ChartsGrid horizontal />
        <BarPlot />
        <ChartsXAxis />
        <ChartsYAxis />
        <ChartsTooltip />
        <ChartsAxisHighlight />
      </ResponsiveChartContainer>
    </div>
  );
}

function Settings() {
  const { localizedKilometersName } = useUnits();

  return (
    <>
      <Typography variant="h6">Goals</Typography>
      <Typography variant="body1">
        Set daily and weekly goals. Weekly goals are only shown in the Overview
        tab here.
      </Typography>

      <FormRows mt={4}>
        <GoalSettings
          resource="distance"
          period="daily"
          label="Daily distance goal"
          unit={localizedKilometersName}
        />
        <GoalSettings
          resource="distance"
          period="weekly"
          label="Weekly distance goal"
          unit={localizedKilometersName}
        />
      </FormRows>
    </>
  );
}
