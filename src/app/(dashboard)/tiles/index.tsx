import { createElement, lazy } from "react";

import { RequireScopes } from "@/components/require-scopes";

import WaterTileContent from "./water";
import {
  GaugeStepsTileContent,
  GaugeDistanceTileContent,
  GaugeFloorsTileContent,
  GaugeCaloriesBurnedTileContent,
  GaugeActiveMinutesTileContent,
} from "./day-stats";
import { CalorieGoalTileContent } from "./calorie-goal";
import Tile from "./tile";
import { SleepTileContent } from "./sleep";
import { CaloriesConsumedTileContent } from "./calories-consumed";
import { LifetimeTileContent } from "./lifetime";

export interface TileDefinition {
  name: string;
  component: React.ComponentType;
  scopes: Array<string>;
  w: number;
  h: number;
}

// Don't change the ids or else this will break existing users!
export const TILE_TYPES: Record<string, TileDefinition> = {
  graph: {
    name: "Graph",
    component: lazy(() => import("./graph")),
    scopes: ["act"],
    w: 4,
    h: 2,
  },
  gaugeSteps: {
    name: "Gauge: Steps",
    component: GaugeStepsTileContent,
    scopes: ["act"],
    w: 1,
    h: 1,
  },
  gaugeDistance: {
    name: "Gauge: Distance",
    component: GaugeDistanceTileContent,
    scopes: ["act"],
    w: 1,
    h: 1,
  },
  gaugeActiveMinutes: {
    name: "Gauge: Active minutes",
    component: GaugeActiveMinutesTileContent,
    scopes: ["act"],
    w: 1,
    h: 1,
  },
  gaugeFloors: {
    name: "Gauge: Floors",
    component: GaugeFloorsTileContent,
    scopes: ["act"],
    w: 1,
    h: 1,
  },
  gaugeCaloriesBurned: {
    name: "Gauge: Calories burned",
    component: GaugeCaloriesBurnedTileContent,
    scopes: ["act"],
    w: 1,
    h: 1,
  },
  water: {
    name: "Water",
    component: WaterTileContent,
    scopes: ["nut"],
    w: 2,
    h: 2,
  },
  calorieGoal: {
    name: "Calories left",
    component: CalorieGoalTileContent,
    scopes: ["act", "nut"],
    w: 2,
    h: 2,
  },
  caloriesConsumed: {
    name: "Calories consumed",
    component: CaloriesConsumedTileContent,
    scopes: ["nut"],
    w: 1,
    h: 1,
  },
  plant: {
    name: "Plant",
    component: lazy(() => import("./plant")),
    scopes: ["act"],
    w: 2,
    h: 2,
  },
  sleep: {
    name: "Sleep",
    component: SleepTileContent,
    scopes: ["sle"],
    w: 2,
    h: 2,
  },
  lifetimeSteps: {
    name: "Lifetime steps",
    component: LifetimeTileContent,
    scopes: ["act"],
    w: 2,
    h: 1,
  },
  lifetimeDistance: {
    name: "Lifetime distance",
    component: LifetimeTileContent,
    scopes: ["act"],
    w: 2,
    h: 1,
  },
  lifetimeFloors: {
    name: "Lifetime floors",
    component: LifetimeTileContent,
    scopes: ["act"],
    w: 2,
    h: 1,
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
