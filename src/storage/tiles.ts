import { atomWithStorage } from "jotai/utils";

export interface UserTile {
  id: string;
  type: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

const defaultTiles: Array<UserTile> = [
  { id: "default-gaugeSteps", type: "gaugeSteps", w: 2, h: 2, x: 0, y: 0 },

  { id: "default-gaugeCalories", type: "gaugeCaloriesBurned", x: 0, y: 2 },
  { id: "default-gaugeDistance", type: "gaugeDistance", x: 1, y: 2 },
  { id: "default-gaugeActiveMinutes", type: "gaugeActiveMinutes", x: 0, y: 3 },
  { id: "default-gaugeFloors", type: "gaugeFloors", x: 1, y: 3 },

  { id: "default-graph", type: "graph", w: 4, h: 2, x: 2, y: 0 },

  { id: "default-water", type: "water", w: 2, h: 2, x: 2, y: 2 },
  { id: "default-calorieGoal", type: "calorieGoal", w: 2, h: 2, x: 4, y: 2 },
  { id: "default-plant", type: "plant", w: 2, h: 2, x: 6, y: 0 },
];

export const userTilesAtom = atomWithStorage("dashboard-tiles", defaultTiles);
