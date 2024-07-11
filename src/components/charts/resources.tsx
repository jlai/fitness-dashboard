import { TimeSeriesResource } from "@/api/times-series";

export interface ChartResourceConfig {
  label: string;
}

export const CHART_RESOURCE_MENU_ITEMS: Array<TimeSeriesResource | "-"> = [
  "steps",
  "distance",
  "calories",
  "floors",
  "-",
  "sleep",
  "resting-heart-rate",
  "heart-rate-zones",
  "-",
  "weight",
  "fat",
  "bmi",
  "-",
  "calories-in",
  "water",
];

export const CHART_RESOURCE_CONFIGS: Record<
  TimeSeriesResource,
  ChartResourceConfig
> = {
  steps: {
    label: "Steps",
  },
  distance: {
    label: "Distance",
  },
  calories: {
    label: "Calories",
  },
  floors: {
    label: "Floors",
  },
  sleep: {
    label: "Sleep",
  },
  "resting-heart-rate": {
    label: "Resting heart rate",
  },
  "heart-rate-zones": {
    label: "Heart rate zones",
  },
  weight: {
    label: "Weight (trend)",
  },
  fat: {
    label: "Fat (trend)",
  },
  bmi: {
    label: "BMI (trend)",
  },
  water: {
    label: "Water logged",
  },
  "calories-in": {
    label: "Calories logged",
  },
};
