import { useMemo } from "react";
import {
  LineLayer,
  Layer,
  Map,
  Source,
  ScaleControl,
  NavigationControl,
  FullscreenControl,
  Marker,
  LngLatBoundsLike,
} from "react-map-gl/maplibre";
import { useAtom } from "jotai";
import type { Feature, LineString } from "geojson";
import { bbox, getCoords } from "@turf/turf";
import { Flag as EndIcon, PlayArrow as StartIcon } from "@mui/icons-material";

import { ParsedTcx, Trackpoint } from "@/api/activity/tcx";
import { SplitDatum } from "@/utils/distances";
import MapStyleControl from "@/components/map/style-control";
import SafeAttributionControl from "@/components/map/attribution-control";
import { mapStyleAtom } from "@/storage/settings";

import { getMapStyle } from "./styles";

import "maplibre-gl/dist/maplibre-gl.css";

const layerStyle: LineLayer = {
  id: "track",
  type: "line",
  paint: {
    "line-color": "red",
    "line-width": 2,
  },
  source: "track",
};

const FIT_BOUNDS_PADDING_PX = 32;

interface SplitInfo {
  index: number;
  coords: [number, number];
}

function getSplitMarkers(
  splits: Array<SplitDatum>,
  trackpoints: Array<Trackpoint>
) {
  const markers: Array<SplitInfo> = [];

  let currentSplitIndex = 0;

  for (const trackpoint of trackpoints) {
    const currentSplit = splits[currentSplitIndex];
    if (!currentSplit) {
      break;
    }

    if (trackpoint.dateTime.getTime() >= currentSplit.endTime.getTime()) {
      if (
        trackpoint.longitudeDegrees &&
        trackpoint.latitudeDegrees &&
        !currentSplit.incomplete
      ) {
        markers.push({
          index: currentSplit.lap,
          coords: [trackpoint.longitudeDegrees, trackpoint.latitudeDegrees],
        });
      }

      currentSplitIndex++;
    }
  }

  return markers;
}

export default function ActivityMap({
  parsedTcx: { geojson, trackpoints },
  tracePosition,
  splits,
}: {
  parsedTcx: ParsedTcx;
  tracePosition?: [number, number];
  splits?: Array<SplitDatum>;
}) {
  const feature = geojson!.features[0];
  const boundingBox = feature && bbox(geojson!);

  const coords = feature && getCoords(feature as Feature<LineString>);
  const startCoords = coords?.[0];
  const endCoords = coords?.[coords.length - 1];

  const splitMarkers = useMemo(
    () => (splits ? getSplitMarkers(splits, trackpoints) : []),
    [splits, trackpoints]
  );

  const [mapStyleId, setMapStyleId] = useAtom(mapStyleAtom);

  return (
    <Map
      mapLib={import("maplibre-gl")}
      initialViewState={{
        bounds: boundingBox as LngLatBoundsLike,
        fitBoundsOptions: {
          maxZoom: 14,
          padding: {
            left: FIT_BOUNDS_PADDING_PX,
            top: FIT_BOUNDS_PADDING_PX,
            right: FIT_BOUNDS_PADDING_PX,
            bottom: FIT_BOUNDS_PADDING_PX,
          },
        },
      }}
      refreshExpiredTiles={false}
      attributionControl={false}
      mapStyle={getMapStyle(mapStyleId)}
    >
      <SafeAttributionControl />
      <ScaleControl />
      <FullscreenControl />
      <NavigationControl visualizePitch showZoom showCompass />
      <MapStyleControl
        position="top-right"
        style={mapStyleId}
        onChange={setMapStyleId}
      />
      <Source id="track" type="geojson" data={geojson}>
        <Layer {...layerStyle} />
      </Source>
      {startCoords && (
        <Marker longitude={startCoords[0]} latitude={startCoords[1]}>
          <div className="bg-slate-100 border-gray-800 rounded-full border-2 p-0.5">
            <StartIcon className="text-slate-600 size-4 block" />
          </div>
        </Marker>
      )}
      {endCoords && (
        <Marker longitude={endCoords[0]} latitude={endCoords[1]}>
          <div className="bg-slate-100 border-gray-800 rounded-full border-2 p-0.5">
            <EndIcon className="text-slate-600 size-4 block" />
          </div>
        </Marker>
      )}
      {tracePosition && (
        <Marker longitude={tracePosition[0]} latitude={tracePosition[1]}>
          <div className="border-teal-600 rounded-full border-2 p-2"></div>
        </Marker>
      )}
      {splitMarkers.map(({ index, coords }) => (
        <Marker
          key={`split-${index}`}
          longitude={coords[0]}
          latitude={coords[1]}
        >
          <div className="bg-slate-100 border-gray-800 border-2 p-0.5 flex items-center justify-center">
            <span className="font-bold text-center align-middle mx-1">
              {index}
            </span>
          </div>
        </Marker>
      ))}
    </Map>
  );
}
