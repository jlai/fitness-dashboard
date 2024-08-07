import {
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Tab,
} from "@mui/material";
import { BarChart } from "@mui/x-charts";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { dropWhile, sumBy } from "lodash";

import { buildActivityIntradayQuery } from "@/api/intraday";
import { ENABLE_INTRADAY } from "@/config";
import { TIME } from "@/utils/date-formats";
import { FRACTION_DIGITS_0 } from "@/utils/number-formats";
import { aggregateByHour } from "@/components/charts/timeseries/aggregation";
import { HeaderBar } from "@/components/layout/rows";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useSelectedDay } from "../../state";
import { useTileSetting } from "../tile";

import {
  DailyGoalSummary,
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
