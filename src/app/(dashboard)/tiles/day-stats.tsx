import {
  GaugeContainer,
  GaugeValueArc,
  GaugeReferenceArc,
} from "@mui/x-charts";
import Image from "next/image";

import { useUnits } from "@/config/units";
import NumericStat from "@/components/numeric-stat";

import stepsIconUrl from "./assets/steps_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import distanceIconUrl from "./assets/distance_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import floorsIconUrl from "./assets/floor_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import activeMinutesIconUrl from "./assets/bolt_24dp_FILL0_wght400_GRAD0_opsz24.svg";
import fireIconUrl from "./assets/fire.svg";
import { useDailySummary } from "./common";

export function GaugeStepsTileContent() {
  const dailySummary = useDailySummary();

  const totalSteps = dailySummary.summary.steps;

  return (
    <StatGauge
      iconSrc={stepsIconUrl}
      value={totalSteps}
      valueMax={dailySummary.goals?.steps ?? 0}
      valueUnits="steps"
    />
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
    <StatGauge
      iconSrc={distanceIconUrl}
      value={localizedTotalDistance}
      valueMax={units.localizedKilometers(dailySummary.goals?.distance ?? 0)}
      valueUnits={units.localizedKilometersName}
    />
  );
}

export function GaugeCaloriesBurnedTileContent() {
  const dailySummary = useDailySummary();

  const burned = dailySummary.summary.caloriesOut;
  const goal = dailySummary.goals?.caloriesOut ?? 0;

  return (
    <StatGauge
      iconSrc={fireIconUrl}
      value={burned}
      valueMax={goal}
      valueUnits="calories"
    />
  );
}

export function GaugeFloorsTileContent() {
  const dailySummary = useDailySummary();

  const floors = dailySummary.summary.floors;
  const goal = dailySummary.goals?.floors ?? 0;

  return (
    <StatGauge
      iconSrc={floorsIconUrl}
      value={floors}
      valueMax={goal}
      valueUnits="floors"
    />
  );
}

export function GaugeActiveMinutesTileContent() {
  const {
    summary: { fairlyActiveMinutes, veryActiveMinutes },
    goals: { activeMinutes } = {},
  } = useDailySummary();

  return (
    <StatGauge
      iconSrc={activeMinutesIconUrl}
      value={fairlyActiveMinutes + veryActiveMinutes}
      valueMax={activeMinutes ?? 0}
      valueUnits="active mins"
    />
  );
}

function StatGauge({
  value,
  valueMax,
  valueUnits,
  iconSrc,
}: {
  /** numeric value; this should use localized values for screen reader support */
  value: number;
  valueMax: number;
  valueUnits: string;
  iconSrc: string;
}) {
  const percent = (100 * value) / valueMax;

  let color;

  if (percent > 99) {
    color = "#90ee02";
  } else if (percent > 65) {
    color = "#ee6002";
  } else {
    color = "#ff9e22";
  }

  return (
    <div className="size-full max-h-full p-2">
      <div className="size-full max-h-full flex flex-col">
        <div className="flex-1 relative min-h-0">
          <GaugeContainer
            startAngle={-180}
            endAngle={180}
            value={value}
            valueMax={valueMax}
            cornerRadius="50%"
          >
            <GaugeReferenceArc />
            <GaugeValueArc style={{ fill: color }} />
          </GaugeContainer>
          <div className="absolute inset-1/4 flex place-content-center">
            <Image src={iconSrc} alt="" className="size-3/4 self-center" />
          </div>
        </div>
        <NumericStat
          className="self-center"
          value={value}
          unit={valueUnits}
          maximumFractionDigits={2}
        />
      </div>
    </div>
  );
}
