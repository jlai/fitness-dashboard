import { HeartRateZone } from "./times-series";

export interface HeartRateZoneStats {
  minutes: number;
  min: number;
  max: number;
  caloriesOut: number;
}

export interface ParsedHeartRateZones {
  outOfRange: HeartRateZoneStats;
  fatBurn: HeartRateZoneStats;
  cardio: HeartRateZoneStats;
  peak: HeartRateZoneStats;
}

export function parseHeartRateZones(zones: Array<HeartRateZone>) {
  const parsed: Partial<ParsedHeartRateZones> = {};

  for (const zone of zones) {
    switch (zone.name) {
      case "Out of Range":
        parsed.outOfRange = zone;
        break;
      case "Fat Burn":
        parsed.fatBurn = zone;
        break;
      case "Cardio":
        parsed.cardio = zone;
        break;
      case "Peak":
        parsed.peak = zone;
        break;
    }
  }

  return parsed as ParsedHeartRateZones;
}
