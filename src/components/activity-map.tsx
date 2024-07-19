import { useMemo } from "react";
import {
  LineLayer,
  Layer,
  Map,
  Source,
  ScaleControl,
  AttributionControl,
  NavigationControl,
  FullscreenControl,
  Marker,
  LngLatBoundsLike,
} from "react-map-gl/maplibre";
import type { FeatureCollection, Feature, LineString } from "geojson";
import {
  bbox,
  featureEach,
  findPoint,
  getCoord,
  getCoords,
  lineChunk,
} from "@turf/turf";
import { Flag as EndIcon, PlayArrow as StartIcon } from "@mui/icons-material";

import { useUnits } from "@/config/units";
import { MAPLIBRE_STYLE_URL } from "@/config";

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

function getSplits(feature: Feature, units: "miles" | "kilometers") {
  const chunks = lineChunk(feature as Feature<LineString>, 1, {
    units,
  });
  const markers: Array<SplitInfo> = [];

  featureEach(chunks, (chunk, index) => {
    if (index === 0) {
      // skip first chunk
      return;
    }

    const point = findPoint(chunk, { featureIndex: 0 });
    markers.push({
      index,
      coords: getCoord(point) as [number, number],
    });
  });

  return markers;
}

export default function ActivityMap({
  geojson,
}: {
  geojson: FeatureCollection;
}) {
  const { distanceUnit } = useUnits();
  const feature = geojson.features[0];
  const boundingBox = feature && bbox(geojson);

  const coords = feature && getCoords(feature as Feature<LineString>);
  const startCoords = coords?.[0];
  const endCoords = coords?.[coords.length - 1];

  const splits = useMemo(
    () => getSplits(feature, distanceUnit === "en_US" ? "miles" : "kilometers"),
    [feature, distanceUnit]
  );

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
      mapStyle={MAPLIBRE_STYLE_URL}
    >
      <AttributionControl compact />
      <ScaleControl />
      <FullscreenControl />
      <NavigationControl visualizePitch showZoom showCompass />
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
      {splits.map(({ index, coords }) => (
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
