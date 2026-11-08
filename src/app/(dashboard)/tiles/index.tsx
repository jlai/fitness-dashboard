import { createElement, lazy } from "react";

import { TIME_SERIES_CONFIGS } from "@/api/times-series";
import { RequireScopes } from "@/components/require-scopes";
import {
  ACTIVITY_AND_FITNESS_READONLY,
  NUTRITION_READONLY,
  SETTINGS_READONLY,
  SLEEP_READONLY,
  type GoogleHealthScope,
} from "@/config/google-health-scopes";

import WaterTileContent from "./water";
import {
  GaugeStepsTileContent,
  GaugeDistanceTileContent,
  GaugeFloorsTileContent,
  GaugeCaloriesBurnedTileContent,
  GaugeActiveMinutesTileContent,
  GaugeActiveZoneMinutesTileContent,
} from "./day-stats";
import { CalorieGoalTileContent } from "./calorie-goal";
import Tile from "./tile";
import { SleepTileContent } from "./sleep";
import { CaloriesConsumedTileContent } from "./calories-consumed";
import { LifetimeTileContent } from "./lifetime";
import { WeightTileContent } from "./weight";
import { HeartRateTileContent } from "./heart-rate";
import { TrackerStatusTileContent } from "./tracker-status";

export interface TileDefinition {
  name: string;
  component: React.ComponentType;
  scopes: Array<GoogleHealthScope>;
  w: number;
  h: number;
  max?: number;
}

// Don't change the ids or else this will break existing users!
export const TILE_TYPES: Record<string, TileDefinition> = {
  graph: {
    name: "Graph",
    component: lazy(() => import("./graph")),
    // TimeSeriesChart gates on the selected resource's requiredScopes.
    scopes: [],
    w: 4,
    h: 2,
    max: 3,
  },
  gaugeSteps: {
    name: "Gauge: Steps",
    component: GaugeStepsTileContent,
    scopes: TIME_SERIES_CONFIGS.steps.requiredScopes,
    w: 1,
    h: 1,
  },
  gaugeDistance: {
    name: "Gauge: Distance",
    component: GaugeDistanceTileContent,
    scopes: TIME_SERIES_CONFIGS.distance.requiredScopes,
    w: 1,
    h: 1,
  },
  gaugeActiveMinutes: {
    name: "Gauge: Active minutes",
    component: GaugeActiveMinutesTileContent,
    scopes: TIME_SERIES_CONFIGS["active-minutes"].requiredScopes,
    w: 1,
    h: 1,
  },
  gaugeActiveZoneMinutes: {
    name: "Gauge: Active zone minutes",
    component: GaugeActiveZoneMinutesTileContent,
    scopes: TIME_SERIES_CONFIGS["active-zone-minutes"].requiredScopes,
    w: 1,
    h: 1,
  },
  gaugeFloors: {
    name: "Gauge: Floors",
    component: GaugeFloorsTileContent,
    scopes: TIME_SERIES_CONFIGS.floors.requiredScopes,
    w: 1,
    h: 1,
  },
  gaugeCaloriesBurned: {
    name: "Gauge: Calories burned",
    component: GaugeCaloriesBurnedTileContent,
    scopes: TIME_SERIES_CONFIGS.calories.requiredScopes,
    w: 1,
    h: 1,
  },
  water: {
    name: "Water",
    component: WaterTileContent,
    scopes: [...TIME_SERIES_CONFIGS.water.requiredScopes, NUTRITION_READONLY],
    w: 2,
    h: 2,
  },
  calorieGoal: {
    name: "Calories left",
    component: CalorieGoalTileContent,
    scopes: [NUTRITION_READONLY],
    w: 2,
    h: 2,
  },
  caloriesConsumed: {
    name: "Calories consumed",
    component: CaloriesConsumedTileContent,
    scopes: [NUTRITION_READONLY],
    w: 1,
    h: 1,
  },
  plant: {
    name: "Plant",
    component: lazy(() => import("./plant")),
    scopes: [ACTIVITY_AND_FITNESS_READONLY],
    w: 2,
    h: 2,
  },
  sleep: {
    name: "Sleep",
    component: SleepTileContent,
    scopes: [SLEEP_READONLY],
    w: 2,
    h: 2,
  },
  lifetimeSteps: {
    name: "Lifetime steps",
    component: LifetimeTileContent,
    scopes: [ACTIVITY_AND_FITNESS_READONLY],
    w: 2,
    h: 1,
  },
  lifetimeDistance: {
    name: "Lifetime distance",
    component: LifetimeTileContent,
    scopes: [ACTIVITY_AND_FITNESS_READONLY],
    w: 2,
    h: 1,
  },
  lifetimeFloors: {
    name: "Lifetime floors",
    component: LifetimeTileContent,
    scopes: [ACTIVITY_AND_FITNESS_READONLY],
    w: 2,
    h: 1,
  },
  hourlyStepGoal: {
    name: "Hourly step goal",
    component: lazy(() => import("./hourly-step-goal")),
    scopes: TIME_SERIES_CONFIGS.steps.requiredScopes,
    w: 2,
    h: 2,
  },
  weight: {
    name: "Weight",
    component: WeightTileContent,
    scopes: TIME_SERIES_CONFIGS.weight.requiredScopes,
    w: 1,
    h: 1,
  },
  heartRate: {
    name: "Heart rate",
    component: HeartRateTileContent,
    scopes: TIME_SERIES_CONFIGS.heart.requiredScopes,
    w: 1,
    h: 1,
  },
  trackerStatus: {
    name: "Battery & sync time",
    component: TrackerStatusTileContent,
    scopes: [SETTINGS_READONLY],
    w: 1,
    h: 1,
  },
  activities: {
    name: "Activities",
    component: lazy(() => import("./activities")),
    scopes: [ACTIVITY_AND_FITNESS_READONLY],
    w: 2,
    h: 2,
  },
};

export function LazyTile({ type }: { type: string }) {
  const tileDef = TILE_TYPES[type];

  if (!tileDef) {
    return (
      <Tile>
        <div>Unknown tile: {type}</div>
      </Tile>
    );
  }

  const content = createElement(tileDef.component);

  return (
    <Tile>
      <RequireScopes scopes={tileDef.scopes} compact name={tileDef.name}>
        {content}
      </RequireScopes>
    </Tile>
  );
}
