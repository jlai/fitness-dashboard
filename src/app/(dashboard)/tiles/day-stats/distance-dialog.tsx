import { DialogActions, DialogContent, DialogTitle, Tab } from "@mui/material";
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
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import { TIME } from "@/utils/date-formats";
import { FRACTION_DIGITS_2 } from "@/utils/number-formats";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";
import { useUnits } from "@/config/units";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useSelectedDay } from "../../state";
import { useDailySummary } from "../common";

import { DailyGoalSummary } from "./goals";

export default function DistanceDialogContent(props: RenderDialogContentProps) {
  const [currentTab, setCurrentTab] = useState("overview");

  return (
    <>
      <DialogTitle align="center">Distance</DialogTitle>
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
              <DistanceIntraday />
            </TabPanel>
          )}
        </TabContext>
      </DialogContent>
      <DialogActions>{props.closeButton}</DialogActions>
    </>
  );
}

function Overview() {
  const { summary, goals } = useDailySummary();
  const { localizedKilometers, localizedKilometersNameLong } = useUnits();

  const totalDistance =
    (summary.distances ?? []).find((entry) => entry.activity === "total")
      ?.distance ?? 0;

  const localizedTotalDistance = localizedKilometers(totalDistance);
  const dailyGoal = localizedKilometers(goals?.distance ?? 0);

  return (
    <DailyGoalSummary
      currentTotal={localizedTotalDistance}
      dailyGoal={dailyGoal}
      unit={localizedKilometersNameLong}
    />
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
