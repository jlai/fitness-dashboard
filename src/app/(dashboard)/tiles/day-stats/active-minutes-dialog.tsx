import {
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Tab,
  Typography,
} from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";

import { FormRows } from "@/components/forms/form-row";
import {
  buildTimeSeriesQuery,
  TimeSeriesEntry,
  HeartTimeSeriesValue,
} from "@/api/times-series";

import { RenderDialogContentProps } from "../tile-with-dialog";
import { useTileSetting } from "../tile";
import { useDailySummary } from "../common";
import { useSelectedDay } from "../../state";

import { DailyGoalSummary, GoalSettings } from "./goals";

type ActiveMinutesSource = "mets" | "heart-rate-zones";

export interface ActiveMinutesTileSettings {
  defaultTab: string;
  source: ActiveMinutesSource;
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

const ACTIVE_MINUTES_HEART_RATE_ZONES = new Set(["Fat Burn", "Cardio", "Peak"]);

export function useActiveMinutes(source: ActiveMinutesSource) {
  const selectedDay = useSelectedDay();

  const {
    summary: { fairlyActiveMinutes, veryActiveMinutes },
    goals: { activeMinutes: activeMinutesGoal } = {},
  } = useDailySummary();

  const { data: heartSeries } = useQuery({
    ...buildTimeSeriesQuery<TimeSeriesEntry<HeartTimeSeriesValue>>(
      "heart",
      selectedDay,
      selectedDay
    ),
    enabled: source === "heart-rate-zones",
  });

  let activeMinutes = 0;

  // Allow calculating using METs (mainly for devices without HR) or heart rate zones
  switch (source) {
    case "heart-rate-zones":
      for (const zone of heartSeries?.[0]?.value.heartRateZones ?? []) {
        if (ACTIVE_MINUTES_HEART_RATE_ZONES.has(zone.name)) {
          activeMinutes += zone.minutes;
        }
      }
      break;
    default:
      activeMinutes = fairlyActiveMinutes + veryActiveMinutes;
  }

  return {
    activeMinutesGoal,
    activeMinutes,
  };
}

function Overview() {
  const [source] = useTileSetting<ActiveMinutesTileSettings, "source">(
    "source",
    "mets"
  );

  const { activeMinutes, activeMinutesGoal } = useActiveMinutes(source);

  return (
    <>
      <Typography variant="body1" mb={4}>
        Active minutes are the number of minutes spent moderately or very
        active. This is different from Active Zone Minutes. See the{" "}
        <a
          href="https://support.google.com/fitbit/answer/14236509"
          target="_blank"
          className="underline"
        >
          Fitbit FAQ page
        </a>{" "}
        for a more detailed explanation.
      </Typography>
      <Stack direction="row" justifyContent="center">
        <DailyGoalSummary
          currentTotal={activeMinutes}
          dailyGoal={activeMinutesGoal ?? 0}
          unit="mins"
        />
      </Stack>
    </>
  );
}

function RadioOption({
  label,
  detail,
  value,
}: {
  label: React.ReactNode;
  detail: React.ReactNode;
  value: string;
}) {
  return (
    <div>
      <FormControlLabel
        value={value}
        control={<Radio />}
        label={
          <>
            <Typography variant="body1">{label}</Typography>
            <Typography variant="subtitle2">{detail}</Typography>
          </>
        }
      />
    </div>
  );
}

function Settings() {
  const [source, setSource] = useTileSetting<
    ActiveMinutesTileSettings,
    "source"
  >("source", "mets");

  return (
    <div className="flex flex-col gap-y-4">
      <section>
        <Typography variant="h6">Calculation</Typography>
        <Typography variant="body1" mb={2}>
          Configure how active minutes are calculated on this dashboard.
        </Typography>

        <RadioGroup
          className="flex flex-col gap-y-2"
          value={source}
          onChange={(e) => setSource(e.target.value as ActiveMinutesSource)}
        >
          <RadioOption
            value="mets"
            label="Movement"
            detail={
              <>
                Use movement to determine active minutes. Recommended for
                trackers without heart rate sensors.
              </>
            }
          />
          <RadioOption
            value="heart-rate-zones"
            label="Heart rate zones"
            detail={
              <>
                <p>
                  Use heart rate zones to determine active minutes. Only minutes
                  in fat burn zone and higher are counted as active.
                </p>
                <p>
                  This is similar to Active Zone Minutes but without the
                  multiplier.
                </p>
              </>
            }
          />
        </RadioGroup>
      </section>
      <section>
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
      </section>
    </div>
  );
}
