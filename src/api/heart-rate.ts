import {
  HeartRateZoneHeartRateZoneType,
  type HeartRateZone,
} from "@generated/orval/fetch/google-health-api/models";

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

function toZoneStats(zone: HeartRateZone): HeartRateZoneStats | undefined {
  const min = Number(zone.minBeatsPerMinute);
  const max = Number(zone.maxBeatsPerMinute);

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return undefined;
  }

  return {
    min,
    max,
    minutes: 0,
    caloriesOut: 0,
  };
}

/** Map Google Health daily heart-rate zones onto the chart color-map shape. */
export function parseDailyHeartRateZones(
  zones?: Array<HeartRateZone>,
): ParsedHeartRateZones | undefined {
  if (!zones?.length) {
    return undefined;
  }

  const parsed: Partial<ParsedHeartRateZones> = {};

  for (const zone of zones) {
    const stats = toZoneStats(zone);
    if (!stats) {
      continue;
    }

    switch (zone.heartRateZoneType) {
      case HeartRateZoneHeartRateZoneType.LIGHT:
        parsed.outOfRange = stats;
        break;
      case HeartRateZoneHeartRateZoneType.MODERATE:
        parsed.fatBurn = stats;
        break;
      case HeartRateZoneHeartRateZoneType.VIGOROUS:
        parsed.cardio = stats;
        break;
      case HeartRateZoneHeartRateZoneType.PEAK:
        parsed.peak = stats;
        break;
    }
  }

  if (!parsed.outOfRange || !parsed.fatBurn || !parsed.cardio || !parsed.peak) {
    return undefined;
  }

  return parsed as ParsedHeartRateZones;
}
