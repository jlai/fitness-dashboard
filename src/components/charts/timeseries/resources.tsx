import { TimeSeriesResource } from "@/api/times-series";

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

export interface ChartResourceConfig {
  label: string;
  component: React.ComponentType<{}>;
  scopes: Array<string>;
}

export const CHART_RESOURCE_CONFIGS: Record<
  TimeSeriesResource,
  ChartResourceConfig
> = {
  steps: {
    label: "Steps",
    component: StepsChart,
    scopes: ["act"],
  },
  distance: {
    label: "Distance",
    component: DistanceChart,
    scopes: ["act"],
  },
  calories: {
    label: "Calories burned",
    component: CaloriesBurnedChart,
    scopes: ["act"],
  },
  floors: {
    label: "Floors",
    component: FloorsChart,
    scopes: ["act"],
  },
  sleep: {
    label: "Sleep",
    component: SleepChart,
    scopes: ["sle"],
  },
  "resting-heart-rate": {
    label: "Resting heart rate",
    component: RestingHeartRateChart,
    scopes: ["hr"],
  },
  "heart-rate-zones": {
    label: "Heart rate zones",
    component: HeartRateZonesChart,
    scopes: ["hr"],
  },
  weight: {
    label: "Weight (trend)",
    component: WeightChart,
    scopes: ["wei"],
  },
  fat: {
    label: "Fat (trend)",
    component: FatChart,
    scopes: ["wei"],
  },
  bmi: {
    label: "BMI (trend)",
    component: BmiChart,
    scopes: ["wei"],
  },
  water: {
    label: "Water logged",
    component: WaterChart,
    scopes: ["nut"],
  },
  "calories-in": {
    label: "Calories logged",
    component: CaloriesConsumedChart,
    scopes: ["nut"],
  },
  "active-zone-minutes": {
    label: "Active Zone Minutes",
    component: ActiveZoneMinutesChart,
    scopes: ["act"],
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
  "calories-in",
  "water",
];
