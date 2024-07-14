import { createElement, lazy } from "react";

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
import GraphTileContent from "./graph";
import { SleepTileContent } from "./sleep";

export interface TileDefinition {
  name: string;
  component: React.ComponentType;
  w: number;
  h: number;
}

// Don't change the ids or else this will break existing users!
export const TILE_TYPES: Record<string, TileDefinition> = {
  graph: {
    name: "Graph",
    component: GraphTileContent,
    w: 4,
    h: 2,
  },
  gaugeSteps: {
    name: "Gauge: Steps",
    component: GaugeStepsTileContent,
    w: 1,
    h: 1,
  },
  gaugeDistance: {
    name: "Gauge: Distance",
    component: GaugeDistanceTileContent,
    w: 1,
    h: 1,
  },
  gaugeActiveMinutes: {
    name: "Gauge: Active minutes",
    component: GaugeActiveMinutesTileContent,
    w: 1,
    h: 1,
  },
  gaugeFloors: {
    name: "Gauge: Floors",
    component: GaugeFloorsTileContent,
    w: 1,
    h: 1,
  },
  gaugeCaloriesBurned: {
    name: "Gauge: Calories burned",
    component: GaugeCaloriesBurnedTileContent,
    w: 1,
    h: 1,
  },
  water: {
    name: "Water",
    component: WaterTileContent,
    w: 2,
    h: 2,
  },
  calorieGoal: {
    name: "Calories left",
    component: CalorieGoalTileContent,
    w: 2,
    h: 2,
  },
  plant: {
    name: "Plant",
    component: lazy(() => import("./plant")),
    w: 2,
    h: 2,
  },
  sleep: {
    name: "Sleep",
    component: SleepTileContent,
    w: 2,
    h: 2,
  },
};

export function LazyTile({ type }: { type: string }) {
  const tileDef = TILE_TYPES[type];
  let content;

  if (tileDef) {
    content = createElement(tileDef.component);
  } else {
    content = <div>Unknown tile</div>;
  }

  return <Tile>{content}</Tile>;
}
