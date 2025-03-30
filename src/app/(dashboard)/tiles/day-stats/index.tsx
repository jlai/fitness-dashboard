import { lazy } from "react";
import { useQuery } from "@tanstack/react-query";

import { useUnits } from "@/config/units";
import {
  ActiveZoneMinutesTimeSeriesValue,
  buildTimeSeriesQuery,
  TimeSeriesEntry,
} from "@/api/times-series";
import { buildActivityGoalsQuery } from "@/api/activity/goals";

import { useDailySummary } from "../common";
import stepsIconUrl from "../assets/steps_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import distanceIconUrl from "../assets/distance_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import floorsIconUrl from "../assets/floor_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import activeMinutesIconUrl from "../assets/bolt_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import activeZoneMinutesIconUrl from "../assets/azm_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import fireIconUrl from "../assets/fire.svg";
import { TileWithDialog } from "../tile-with-dialog";
import { useSelectedDay } from "../../state";

import StatGauge from "./stat-gauge";
import ActiveMinutesDialogContent from "./active-minutes-dialog";
import ActiveZoneMinutesDialogContent from "./active-zone-minutes-dialog";

const StepsDialogContent = lazy(async () => await import("./steps-dialog"));
const DistanceDialogContent = lazy(
  async () => await import("./distance-dialog")
);
const CaloriesDialogContent = lazy(
  async () => await import("./calories-dialog")
);
const FloorsDialogContent = lazy(async () => await import("./floors-dialog"));

export function GaugeStepsTileContent() {
  const dailySummary = useDailySummary();

  const totalSteps = dailySummary.summary.steps;

  return (
    <TileWithDialog
      dialogComponent={StepsDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={stepsIconUrl}
        value={totalSteps}
        valueMax={dailySummary.goals?.steps ?? 0}
        valueUnits="steps"
      />
    </TileWithDialog>
  );
}

export function GaugeDistanceTileContent() {
  const dailySummary = useDailySummary();
  const units = useUnits();

  const totalDistance =
    (dailySummary.summary.distances ?? []).find(
      (entry) => entry.activity === "total"
    )?.distance ?? 0;

  const localizedTotalDistance = units.localizedKilometers(totalDistance);

  return (
    <TileWithDialog
      dialogComponent={DistanceDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={distanceIconUrl}
        value={localizedTotalDistance}
        valueMax={units.localizedKilometers(dailySummary.goals?.distance ?? 0)}
        valueUnits={units.localizedKilometersName}
      />
    </TileWithDialog>
  );
}

export function GaugeCaloriesBurnedTileContent() {
  const dailySummary = useDailySummary();

  const burned = dailySummary.summary.caloriesOut;
  const goal = dailySummary.goals?.caloriesOut ?? 0;

  return (
    <TileWithDialog
      dialogComponent={CaloriesDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={fireIconUrl}
        value={burned}
        valueMax={goal}
        valueUnits="calories"
      />
    </TileWithDialog>
  );
}

export function GaugeFloorsTileContent() {
  const dailySummary = useDailySummary();

  const floors = dailySummary.summary.floors;
  const goal = dailySummary.goals?.floors ?? 0;

  return (
    <TileWithDialog
      dialogComponent={FloorsDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={floorsIconUrl}
        value={floors}
        valueMax={goal}
        valueUnits="floors"
      />
    </TileWithDialog>
  );
}

export function GaugeActiveMinutesTileContent() {
  const {
    summary: { fairlyActiveMinutes, veryActiveMinutes },
    goals: { activeMinutes } = {},
  } = useDailySummary();

  return (
    <TileWithDialog
      dialogComponent={ActiveMinutesDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={activeMinutesIconUrl}
        value={fairlyActiveMinutes + veryActiveMinutes}
        valueMax={activeMinutes ?? 0}
        valueUnits="active mins"
      />
    </TileWithDialog>
  );
}

export function GaugeActiveZoneMinutesTileContent() {
  const selectedDay = useSelectedDay();

  const { data: goals } = useQuery(buildActivityGoalsQuery("daily"));

  const { data: azmSeries } = useQuery(
    buildTimeSeriesQuery<TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>>(
      "active-zone-minutes",
      selectedDay,
      selectedDay
    )
  );

  if (!azmSeries) {
    return null;
  }

  const dayAzm = azmSeries.find((entry) =>
    selectedDay.isSame(entry.dateTime, "day")
  );
  const dayAzmValue = dayAzm?.value.activeZoneMinutes ?? 0;

  return (
    <TileWithDialog
      dialogComponent={ActiveZoneMinutesDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={activeZoneMinutesIconUrl}
        value={dayAzmValue}
        valueMax={goals?.activeZoneMinutes ?? 0}
        valueUnits="zone mins"
      />
    </TileWithDialog>
  );
}
