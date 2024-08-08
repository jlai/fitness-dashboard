import { ScaleLinear, scaleLinear } from "d3-scale";

import { IntradayEntry } from "@/api/intraday";
import { Trackpoint } from "@/api/activity/tcx";

import { LocalizedTrackpoint } from "./load-tcx";

type DistanceScale = ScaleLinear<number | undefined, Date | undefined, unknown>;

export function trackpointsHasDistances(
  trackpoints: Array<Trackpoint | LocalizedTrackpoint>
) {
  return trackpoints.some((trackpoint) => trackpoint.distanceMeters);
}

/** Create a scale that maps time to distance */
export function createDistanceScale<TTrackopint extends Trackpoint>(
  trackpoints: Array<TTrackopint>
): DistanceScale {
  const domain = [];
  const range = [];

  for (const trackpoint of trackpoints) {
    domain.push(trackpoint.dateTime);
    range.push(trackpoint.distanceMeters);
  }

  return scaleLinear(domain, range);
}

/**
 * Given a timeseries dataset, add interpolated distances from TCX trackpoints.
 */
export function augmentWithDistances(
  data: Array<IntradayEntry>,
  distanceScale: DistanceScale
) {
  return data.map((datum) => ({
    ...datum,
    distanceMeters: distanceScale(datum.dateTime),
  }));
}
