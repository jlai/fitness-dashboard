import { tcx as tcxToGeoJson } from "@tmcw/togeojson";
import { FeatureCollection } from "geojson";

export type Trackpoint = {
  dateTime: Date;
  latitudeDegrees?: number;
  longitudeDegrees?: number;
  altitudeMeters?: number;
  distanceMeters?: number;
  heartBpm?: number;
};

function parseOptionalNumber(stringValue?: string | null) {
  return stringValue ? Number(stringValue) : undefined;
}

export interface ParsedTcx {
  trackpoints: Array<Trackpoint>;
  geojson: FeatureCollection | null;
}

export function parseTcx(tcxString: string): ParsedTcx {
  const tcxDocument = new DOMParser().parseFromString(tcxString, "text/xml");

  let hasLocation = false;
  const trackpoints: Array<Trackpoint> = [];

  let lastDistanceMeters: number | undefined = undefined;

  tcxDocument.querySelectorAll("Trackpoint").forEach((node) => {
    const dateTime = new Date(node.querySelector("Time")?.textContent!);

    const longitudeDegrees = parseOptionalNumber(
      node.querySelector("Position LongitudeDegrees")?.textContent
    );

    const latitudeDegrees = parseOptionalNumber(
      node.querySelector("Position LatitudeDegrees")?.textContent
    );

    const altitudeMeters = parseOptionalNumber(
      node.querySelector("AltitudeMeters")?.textContent
    );
    let distanceMeters = parseOptionalNumber(
      node.querySelector("DistanceMeters")?.textContent
    );
    const heartBpm = parseOptionalNumber(
      node.querySelector("HeartRateBpm Value")?.textContent
    );

    if (latitudeDegrees) {
      hasLocation = true;
    }

    if (
      distanceMeters !== undefined &&
      lastDistanceMeters !== undefined &&
      distanceMeters < lastDistanceMeters
    ) {
      // Sometimes distanceMeters gets reset to zero for some reason; prevent backsliding
      distanceMeters = lastDistanceMeters;
    }

    lastDistanceMeters = distanceMeters;

    trackpoints.push({
      dateTime,
      latitudeDegrees,
      longitudeDegrees,
      altitudeMeters,
      distanceMeters,
      heartBpm,
    });
  });

  const geojson = hasLocation ? tcxToGeoJson(tcxDocument) : null;

  return {
    trackpoints,
    geojson,
  };
}
