import { lazy } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";

import { useUnits, kilometersFromDistanceGoal } from "@/config/units";
import {
  ActiveZoneMinutesTimeSeriesValue,
  buildTimeSeriesQuery,
  getTimeSeriesValueForDay,
  TimeSeriesEntry,
} from "@/api/times-series";
import { getGoalsAtom } from "@/storage/goals";

import { useSelectedDayTimeSeries } from "../common";
import stepsIconUrl from "../assets/steps_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import distanceIconUrl from "../assets/distance_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import floorsIconUrl from "../assets/floor_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import activeMinutesIconUrl from "../assets/bolt_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import activeZoneMinutesIconUrl from "../assets/azm_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import fireIconUrl from "../assets/fire.svg";
import { TileWithDialog } from "../tile-with-dialog";
import { useSelectedDay } from "../../state";
import { useTileSetting } from "../tile";

import StatGauge from "./stat-gauge";
import ActiveMinutesDialogContent, {
  ActiveMinutesTileSettings,
  useActiveMinutes,
} from "./active-minutes-dialog";
import ActiveZoneMinutesDialogContent from "./active-zone-minutes-dialog";

const StepsDialogContent = lazy(async () => await import("./steps-dialog"));
const DistanceDialogContent = lazy(
  async () => await import("./distance-dialog"),
);
const CaloriesDialogContent = lazy(
  async () => await import("./calories-dialog"),
);
const FloorsDialogContent = lazy(async () => await import("./floors-dialog"));

export function GaugeStepsTileContent() {
  const totalSteps = Number(useSelectedDayTimeSeries("steps") ?? 0);
  const stepsGoal = useAtomValue(getGoalsAtom("steps", "daily"));

  return (
    <TileWithDialog
      dialogComponent={StepsDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={stepsIconUrl}
        value={totalSteps}
        valueMax={stepsGoal?.value}
        valueUnits="steps"
      />
    </TileWithDialog>
  );
}

export function GaugeDistanceTileContent() {
  const totalDistance = Number(useSelectedDayTimeSeries("distance") ?? 0);
  const distanceGoal = useAtomValue(getGoalsAtom("distance", "daily"));
  const units = useUnits();

  const localizedTotalDistance = units.localizedKilometers(totalDistance);

  return (
    <TileWithDialog
      dialogComponent={DistanceDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={distanceIconUrl}
        value={localizedTotalDistance}
        valueMax={
          distanceGoal
            ? units.localizedKilometers(
                kilometersFromDistanceGoal(
                  distanceGoal.value,
                  distanceGoal.unit,
                ),
              )
            : undefined
        }
        valueUnits={units.localizedKilometersName}
      />
    </TileWithDialog>
  );
}

export function GaugeCaloriesBurnedTileContent() {
  const burned = Number(useSelectedDayTimeSeries("calories") ?? 0);
  const goal = useAtomValue(getGoalsAtom("caloriesOut", "daily"));

  return (
    <TileWithDialog
      dialogComponent={CaloriesDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={fireIconUrl}
        value={burned}
        valueMax={goal?.value}
        valueUnits="calories"
      />
    </TileWithDialog>
  );
}

export function GaugeFloorsTileContent() {
  const floors = Number(useSelectedDayTimeSeries("floors") ?? 0);
  const goal = useAtomValue(getGoalsAtom("floors", "daily"));

  return (
    <TileWithDialog
      dialogComponent={FloorsDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={floorsIconUrl}
        value={floors}
        valueMax={goal?.value}
        valueUnits="floors"
      />
    </TileWithDialog>
  );
}

export function GaugeActiveMinutesTileContent() {
  const [source] = useTileSetting<ActiveMinutesTileSettings, "source">(
    "source",
    "mets",
  );

  const { activeMinutes, activeMinutesGoal } = useActiveMinutes(source);

  return (
    <TileWithDialog
      dialogComponent={ActiveMinutesDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={activeMinutesIconUrl}
        value={activeMinutes}
        valueMax={activeMinutesGoal}
        valueUnits="active mins"
      />
    </TileWithDialog>
  );
}

export function GaugeActiveZoneMinutesTileContent() {
  const selectedDay = useSelectedDay();
  const activeZoneMinutesGoal = useAtomValue(
    getGoalsAtom("activeZoneMinutes", "daily"),
  );

  const { data: azmSeries } = useQuery(
    buildTimeSeriesQuery<TimeSeriesEntry<ActiveZoneMinutesTimeSeriesValue>>(
      "active-zone-minutes",
      selectedDay,
      selectedDay,
    ),
  );

  if (!azmSeries) {
    return null;
  }

  const dayAzmValue =
    getTimeSeriesValueForDay(azmSeries, selectedDay)?.activeZoneMinutes ?? 0;

  return (
    <TileWithDialog
      dialogComponent={ActiveZoneMinutesDialogContent}
      dialogProps={{ fullWidth: true, maxWidth: "lg" }}
    >
      <StatGauge
        iconSrc={activeZoneMinutesIconUrl}
        value={dayAzmValue}
        valueMax={activeZoneMinutesGoal?.value}
        valueUnits="zone mins"
      />
    </TileWithDialog>
  );
}
