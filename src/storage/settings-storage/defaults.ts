import type { UserTile } from "@/storage/tiles";

import type {
  ClientOnlyFoodsData,
  ClientOnlyGoalsData,
  DashboardsData,
  MealsData,
  SettingsData,
} from "./schemas";

const defaultDesktopTiles: Array<UserTile> = [
  { id: "default-gaugeSteps", type: "gaugeSteps", w: 2, h: 2, x: 0, y: 0 },
  {
    id: "default-gaugeCalories",
    type: "gaugeCaloriesBurned",
    w: 1,
    h: 1,
    x: 0,
    y: 2,
  },
  {
    id: "default-gaugeDistance",
    type: "gaugeDistance",
    w: 1,
    h: 1,
    x: 1,
    y: 2,
  },
  {
    id: "default-gaugeActiveMinutes",
    type: "gaugeActiveMinutes",
    w: 1,
    h: 1,
    x: 0,
    y: 3,
  },
  { id: "default-gaugeFloors", type: "gaugeFloors", w: 1, h: 1, x: 1, y: 3 },
  { id: "default-graph", type: "graph", w: 3, h: 2, x: 2, y: 0 },
  { id: "default-water", type: "water", w: 1, h: 1, x: 2, y: 2 },
  { id: "default-calorieGoal", type: "calorieGoal", w: 1, h: 1, x: 2, y: 3 },
  { id: "default-plant", type: "plant", w: 2, h: 2, x: 4, y: 2 },
  { id: "default-sleep", type: "sleep", w: 1, h: 1, x: 3, y: 2 },
  {
    id: "default-lifetimeSteps",
    type: "lifetimeSteps",
    w: 1,
    h: 1,
    x: 5,
    y: 0,
  },
  {
    id: "default-lifetimeDistance",
    type: "lifetimeDistance",
    w: 1,
    h: 1,
    x: 5,
    y: 1,
  },
  { id: "default-heartRate", type: "heartRate", w: 1, h: 1, x: 3, y: 3 },
];

const defaultMobileTiles: Array<UserTile> = [
  {
    id: "default-gaugeSteps",
    type: "gaugeSteps",
    w: 1,
    h: 1,
    x: 0,
    y: 0,
  },
  {
    id: "default-gaugeCalories",
    type: "gaugeCaloriesBurned",
    w: 1,
    h: 1,
    x: 0,
    y: 1,
    settings: { defaultTab: "pie" },
  },
  {
    id: "default-gaugeDistance",
    type: "gaugeDistance",
    w: 1,
    h: 1,
    x: 1,
    y: 0,
    settings: { defaultTab: "overview" },
  },
  {
    id: "default-gaugeActiveMinutes",
    type: "gaugeActiveMinutes",
    w: 1,
    h: 1,
    x: 2,
    y: 0,
  },
  {
    id: "default-gaugeFloors",
    type: "gaugeFloors",
    w: 1,
    h: 1,
    x: 1,
    y: 1,
  },
  { id: "default-graph", type: "graph", w: 2, h: 1, x: 0, y: 2 },
  { id: "default-water", type: "water", w: 1, h: 1, x: 2, y: 1 },
  { id: "default-heartRate", type: "heartRate", w: 1, h: 1, x: 0, y: 3 },
  { id: "default-sleep", type: "sleep", w: 1, h: 1, x: 2, y: 2 },
  { id: "default-plant", type: "plant", w: 2, h: 2, x: 1, y: 3 },
  { id: "default-weight", type: "weight", w: 1, h: 1, x: 0, y: 4 },
];

function isMobileViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 600px)").matches
  );
}

/** Default tile layout for the Main dashboard (desktop vs mobile). */
export function getDefaultTiles(): Array<UserTile> {
  return structuredClone(isMobileViewport() ? defaultMobileTiles : defaultDesktopTiles);
}

export function createDefaultDashboardsData(): DashboardsData {
  return {
    dashboards: [
      {
        id: crypto.randomUUID(),
        name: "Main",
        tiles: getDefaultTiles(),
      },
    ],
  };
}

export function createDefaultClientOnlyGoalsData(): ClientOnlyGoalsData {
  return { clientOnlyGoals: [] };
}

export function createDefaultMealsData(): MealsData {
  return { meals: [] };
}

export function createDefaultClientOnlyFoodsData(): ClientOnlyFoodsData {
  return { clientOnlyFoods: [] };
}

export function createDefaultSettingsData(): SettingsData {
  return { settings: {} };
}
