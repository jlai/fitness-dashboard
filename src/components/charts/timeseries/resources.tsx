import { pick } from "lodash";

import { TIME_SERIES_CONFIGS } from "@/api/times-series";

import {
  BmiChart,
  CaloriesBurnedChart,
  CaloriesConsumedChart,
  DistanceChart,
  FatChart,
  FloorsChart,
  SleepChart,
  StepsChart,
  WaterChart,
  WeightChart,
} from "./simple";
import { ActiveZoneMinutesChart } from "./stacked";
import { HeartRateZonesChart, RestingHeartRateChart } from "./heart-rate";
import { CalorieBalanceChart } from "./calorie-balance";

export interface ChartResourceConfig {
  label: string;
  component: React.ComponentType<{}>;
  requiredScopes: Array<string>;
  maxDays: number;
}

export const CHART_RESOURCE_CONFIGS: Record<string, ChartResourceConfig> = {
  steps: {
    label: "Steps",
    component: StepsChart,
    ...pick(TIME_SERIES_CONFIGS.steps, "maxDays", "requiredScopes"),
  },
  distance: {
    label: "Distance",
    component: DistanceChart,
    ...pick(TIME_SERIES_CONFIGS.distance, "maxDays", "requiredScopes"),
  },
  calories: {
    label: "Calories burned",
    component: CaloriesBurnedChart,
    ...pick(TIME_SERIES_CONFIGS.calories, "maxDays", "requiredScopes"),
  },
  floors: {
    label: "Floors",
    component: FloorsChart,
    ...pick(TIME_SERIES_CONFIGS.floors, "maxDays", "requiredScopes"),
  },
  sleep: {
    label: "Sleep",
    component: SleepChart,
    ...pick(TIME_SERIES_CONFIGS.sleep, "maxDays", "requiredScopes"),
  },
  "resting-heart-rate": {
    label: "Resting heart rate",
    component: RestingHeartRateChart,
    ...pick(TIME_SERIES_CONFIGS.heart, "maxDays", "requiredScopes"),
  },
  "heart-rate-zones": {
    label: "Heart rate zones",
    component: HeartRateZonesChart,
    ...pick(TIME_SERIES_CONFIGS.heart, "maxDays", "requiredScopes"),
  },
  weight: {
    label: "Weight (trend)",
    component: WeightChart,
    ...pick(TIME_SERIES_CONFIGS.weight, "maxDays", "requiredScopes"),
  },
  fat: {
    label: "Fat (trend)",
    component: FatChart,
    ...pick(TIME_SERIES_CONFIGS.fat, "maxDays", "requiredScopes"),
  },
  bmi: {
    label: "BMI (trend)",
    component: BmiChart,
    ...pick(TIME_SERIES_CONFIGS.bmi, "maxDays", "requiredScopes"),
  },
  water: {
    label: "Water logged",
    component: WaterChart,
    ...pick(TIME_SERIES_CONFIGS.water, "maxDays", "requiredScopes"),
  },
  "calories-in": {
    label: "Calories logged",
    component: CaloriesConsumedChart,
    ...pick(TIME_SERIES_CONFIGS["calories-in"], "maxDays", "requiredScopes"),
  },
  "active-zone-minutes": {
    label: "Active Zone Minutes",
    component: ActiveZoneMinutesChart,
    ...pick(
      TIME_SERIES_CONFIGS["active-zone-minutes"],
      "maxDays",
      "requiredScopes"
    ),
  },
  "calorie-balance": {
    label: "Calories in vs out",
    component: CalorieBalanceChart,
    requiredScopes: ["act", "nut"],
    maxDays: 1095,
  },
};

export type ChartResource = keyof typeof CHART_RESOURCE_CONFIGS;

export const CHART_RESOURCE_MENU_ITEMS: Array<ChartResource | "-"> = [
  "steps",
  "distance",
  "calories",
  "floors",
  "-",
  "sleep",
  "resting-heart-rate",
  "heart-rate-zones",
  "active-zone-minutes",
  "-",
  "weight",
  "fat",
  "bmi",
  "-",
  "calorie-balance",
  "calories-in",
  "water",
];
