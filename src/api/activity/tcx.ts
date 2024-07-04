import { tcx as tcxToGeoJson } from "@tmcw/togeojson";

export type Trackpoint = {
  time: Date;
  altitudeMeters?: number;
  distanceMeters?: number;
  heartBpm?: number;
};

function parseOptionalNumber(stringValue?: string | null) {
  return stringValue ? Number(stringValue) : undefined;
}

export function parseTcx(tcxString: string) {
  const tcxDocument = new DOMParser().parseFromString(tcxString, "text/xml");

  const trackpoints: Array<Trackpoint> = [];

  tcxDocument.querySelectorAll("Trackpoint").forEach((node) => {
    const time = new Date(node.querySelector("Time")?.textContent!);
    const altitudeMeters = parseOptionalNumber(
      node.querySelector("AltitudeMeters")?.textContent
    );
    const distanceMeters = parseOptionalNumber(
      node.querySelector("DistanceMeters")?.textContent
    );
    const heartBpm = parseOptionalNumber(
      node.querySelector("HeartRateBpm Value")?.textContent
    );

    trackpoints.push({ time, altitudeMeters, distanceMeters, heartBpm });
  });

  return {
    trackpoints,
    geojson: tcxToGeoJson(tcxDocument),
  };
}
