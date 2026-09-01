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
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { LineChart } from "@mui/x-charts";
import { dropWhile } from "es-toolkit";

import { FormRows } from "@/components/forms/form-row";
import { buildTimeSeriesQuery } from "@/api/times-series";
import { TimeSeriesEntry } from "@/api/times-series";
import { ActiveZoneMinutesTimeSeriesValue } from "@/api/times-series";
import { buildActiveZoneMinutesIntradayQuery } from "@/api/intraday";
import { physicalRangeForLocalDay } from "@/api/datetime";
import { DateFormats } from "@/utils/date-formats";
import { HeaderBar } from "@/components/layout/rows";
import { activeZoneMinutesGoalAtom } from "@/storage/settings";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useTileSetting } from "../tile";
import { useSelectedDay } from "../../state";

import { DailyGoalSummary, GoalSettings } from "./goals";

interface ActiveZoneMinutesTileSettings {
  defaultTab: string;
  trim: boolean;
}

export default function ActiveZoneMinutesDialogContent(
  props: RenderDialogContentProps,
) {
  const [currentTab, setCurrentTab] = useTileSetting<
    ActiveZoneMinutesTileSettings,
    "defaultTab"
  >("defaultTab", "overview");

  return (
    <>
      <DialogTitle align="center">Active Zone Minutes</DialogTitle>
      <DialogContent>
        <TabContext value={currentTab}>
          <TabList onChange={(event, value) => setCurrentTab(value)}>
            <Tab label="Overview" value="overview" />
            <Tab label="Details" value="intraday" />
            <Tab label="Settings" value="settings" />
          </TabList>
          <TabPanel value="overview">
            <Suspense>
              <Overview />
            </Suspense>
          </TabPanel>
          <TabPanel value="intraday">
            <Suspense>
              <ActiveZoneMinutesIntraday />
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
  const selectedDay = useSelectedDay();
  const activeZoneMinutesGoal = useAtomValue(activeZoneMinutesGoalAtom);

  const { data: azmSeries } = useQuery(
    buildTimeSeriesQuery<TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>>(
      "active-zone-minutes",
      selectedDay,
      selectedDay,
    ),
  );

  const dayAzm = azmSeries?.find((entry) =>
    selectedDay.isSame(entry.dateTime, "day"),
  );
  const dayAzmValue = dayAzm?.value.activeZoneMinutes ?? 0;

  return (
    <>
      <Typography variant="body1" mb={4}>
        Active Zone Minutes are a quick way to measure your activity in higher
        heart rate zones. You earn 1x active zone minute for every minute of
        activity in the moderate zone, and 2x active zone minutes for every
        minute in vigorous and peak zones.
      </Typography>
      <Stack direction="row" justifyContent="center">
        <DailyGoalSummary
          currentTotal={dayAzmValue}
          dailyGoal={activeZoneMinutesGoal}
          unit="mins"
        />
      </Stack>
    </>
  );
}

function ActiveZoneMinutesIntraday() {
  const day = useSelectedDay();
  const { start: startTime, end: endTime } = physicalRangeForLocalDay(day);

  const [trim, setTrim] = useTileSetting<ActiveZoneMinutesTileSettings, "trim">(
    "trim",
    false,
  );

  const { data } = useQuery(
    buildActiveZoneMinutesIntradayQuery("5min", startTime, endTime),
  );

  let processedData = data?.map((entry) => ({
    dateTime: entry.dateTime,
    value: entry.value.activeZoneMinutes,
  }));

  if (trim) {
    processedData =
      processedData && dropWhile(processedData, (data) => !data.value);
  }

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
      </HeaderBar>
      <LineChart
        grid={{ horizontal: true }}
        height={300}
        loading={!data}
        dataset={processedData ?? []}
        xAxis={[
          {
            dataKey: "dateTime",
            scaleType: "time",
            valueFormatter: DateFormats.formatTime,
          },
        ]}
        yAxis={[{ label: "Zone Mins" }]}
        series={[
          { dataKey: "value", showMark: false, label: "Active Zone Minutes" },
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
        Set daily and weekly active zone minutes goals.
      </Typography>

      <FormRows mt={4}>
        <GoalSettings
          resource="activeZoneMinutes"
          period="daily"
          label="Daily active zone minutes goal"
          unit="mins"
        />
        <GoalSettings
          resource="activeZoneMinutes"
          period="weekly"
          label="Weekly active zone minutes goal"
          unit="mins"
        />
      </FormRows>
    </>
  );
}
