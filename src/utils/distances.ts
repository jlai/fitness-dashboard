import { ScaleLinear, scaleLinear } from "d3-scale";
import { first, last } from "lodash";

import { IntradayEntry } from "@/api/intraday";
import { Trackpoint } from "@/api/activity/tcx";
import { MILES_PER_KM } from "@/config/units";
import { DistanceUnitSystem } from "@/api/user";

export type DistanceScale = ScaleLinear<number, number, unknown>;

export interface SplitDatum {
  lap: number;
  startTime: Date;
  endTime: Date;
  durationMillis: number;
  distanceCoveredMeters: number;

  /** Whether a full lap was completed */
  incomplete: boolean;

  /** Number of milliseconds to complete 1 full lap */
  paceMillis: number;
}
export function trackpointsHasDistances(trackpoints: Array<Trackpoint>) {
  return trackpoints.some((trackpoint) => trackpoint.distanceMeters);
}

/** Create a scale that maps time to distance */
export function createDistanceScale<TTrackpoint extends Trackpoint>(
  trackpoints: Array<TTrackpoint>
): DistanceScale {
  const domain = [];
  const range = [];

  let lastDistance: number | undefined = undefined;

  for (const trackpoint of trackpoints) {
    if (trackpoint.distanceMeters !== undefined) {
      domain.push(trackpoint.dateTime.getTime());
      range.push(trackpoint.distanceMeters);

      lastDistance = trackpoint.distanceMeters;
    }
  }

  return scaleLinear<number, number, never>(domain, range).clamp(true);
}

/**
 * Given a timeseries dataset, add interpolated distances from TCX trackpoints.
 */
export function augmentWithDistances(
  data: Array<IntradayEntry>,
  distanceScale: DistanceScale,
  localizedKilometers: (kilometers: number) => number
) {
  return data.map((datum) => {
    const meters = distanceScale(datum.dateTime) as number;
    return {
      ...datum,
      distanceMeters: meters,
      distanceLocalized: localizedKilometers(meters / 1000),
    };
  });
}

/** Get time splits by distance */
export function getDistanceSplits(
  distanceScale: DistanceScale,
  unitSystem: DistanceUnitSystem
) {
  const metersPerUnit =
    unitSystem === "en_US" ? (1 / MILES_PER_KM) * 1000 : 1000;

  const startTime = first(distanceScale.domain());
  const maxDistance = last(distanceScale.range());

  const splits: Array<SplitDatum> = [];

  if (!startTime || !maxDistance) {
    return splits;
  }

  let lap = 1;
  let elapsedDistance = 0;
  let lastLapEnd = startTime;

  do {
    const distanceStart = elapsedDistance;
    const distanceEnd = Math.min(maxDistance, elapsedDistance + metersPerUnit);
    const timeStart = lastLapEnd;
    const timeEnd = distanceScale.invert(distanceEnd);

    const durationMillis = timeEnd - timeStart;
    const distanceCovered = distanceEnd - distanceStart;

    splits.push({
      lap,
      startTime: new Date(timeStart),
      endTime: new Date(timeEnd),
      durationMillis,
      distanceCoveredMeters: distanceCovered,
      paceMillis: durationMillis / (distanceCovered / metersPerUnit),
      incomplete: distanceCovered < metersPerUnit,
    });

    lap++;
    lastLapEnd = timeEnd;
    elapsedDistance = distanceEnd;
  } while (elapsedDistance < maxDistance);

  return splits;
}
