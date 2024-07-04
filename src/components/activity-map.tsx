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
import { bbox, getCoords } from "@turf/turf";
import { Flag as EndIcon, PlayArrow as StartIcon } from "@mui/icons-material";

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

export default function ActivityMap({
  geojson,
}: {
  geojson: FeatureCollection;
}) {
  const boundingBox = bbox(geojson);

  const coords = getCoords(geojson.features[0] as Feature<LineString>);
  const startCoords = coords[0];
  const endCoords = coords[coords.length - 1];

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
    </Map>
  );
}
