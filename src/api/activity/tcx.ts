import { tcx as tcxToGeoJson } from "@tmcw/togeojson";
import { FeatureCollection } from "geojson";

export type Trackpoint = {
  time: Date;
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

  tcxDocument.querySelectorAll("Trackpoint").forEach((node) => {
    const time = new Date(node.querySelector("Time")?.textContent!);

    const latitudeDegrees = parseOptionalNumber(
      node.querySelector("Position LatitudeDegrees")?.textContent
    );

    const longitudeDegrees = parseOptionalNumber(
      node.querySelector("Position LatitudeDegrees")?.textContent
    );

    const altitudeMeters = parseOptionalNumber(
      node.querySelector("AltitudeMeters")?.textContent
    );
    const distanceMeters = parseOptionalNumber(
      node.querySelector("DistanceMeters")?.textContent
    );
    const heartBpm = parseOptionalNumber(
      node.querySelector("HeartRateBpm Value")?.textContent
    );

    if (latitudeDegrees) {
      hasLocation = true;
    }

    trackpoints.push({
      time,
      latitudeDegrees,
      longitudeDegrees,
      altitudeMeters,
      distanceMeters,
      heartBpm,
    });
  });

  return {
    trackpoints,
    geojson: hasLocation ? tcxToGeoJson(tcxDocument) : null,
  };
}
