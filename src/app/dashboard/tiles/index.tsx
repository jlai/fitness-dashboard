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

interface TileDefinition {
  component: React.ComponentType;
  w: number;
  h: number;
}

// Don't change the ids or else this will break existing users!
export const TILE_TYPES: Record<string, TileDefinition> = {
  graph: {
    component: GraphTileContent,
    w: 4,
    h: 2,
  },
  gaugeSteps: {
    component: GaugeStepsTileContent,
    w: 1,
    h: 1,
  },
  gaugeDistance: {
    component: GaugeDistanceTileContent,
    w: 1,
    h: 1,
  },
  gaugeActiveMinutes: {
    component: GaugeActiveMinutesTileContent,
    w: 1,
    h: 1,
  },
  gaugeFloors: {
    component: GaugeFloorsTileContent,
    w: 1,
    h: 1,
  },
  gaugeCaloriesBurned: {
    component: GaugeCaloriesBurnedTileContent,
    w: 1,
    h: 1,
  },
  water: {
    component: WaterTileContent,
    w: 2,
    h: 2,
  },
  calorieGoal: {
    component: CalorieGoalTileContent,
    w: 2,
    h: 2,
  },
  plant: {
    component: lazy(() => import("./plant")),
    w: 1,
    h: 3,
  },
};

export function LazyTile({ type }: { type: string }) {
  const tileDef = TILE_TYPES[type];
  let content;

  if (tileDef) {
    content = createElement(tileDef.component);
  } else {
    content = <div>Error</div>;
  }

  return <Tile>{content}</Tile>;
}
