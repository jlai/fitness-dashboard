import { ParsedHeartRateZones } from "@/api/heart-rate";

export const OUT_OF_RANGE_COLOR = "#02b2af";
export const FAT_BURN_COLOR = "#f5e12f";
export const CARDIO_COLOR = "#f59f2f";
export const PEAK_COLOR = "#f5492f";

export function createHeartRateZoneColorMap(zones: ParsedHeartRateZones) {
  return {
    type: "piecewise" as const,
    thresholds: [zones.fatBurn.min, zones.cardio.min, zones.peak.min],
    colors: [OUT_OF_RANGE_COLOR, FAT_BURN_COLOR, CARDIO_COLOR, PEAK_COLOR],
  };
}
