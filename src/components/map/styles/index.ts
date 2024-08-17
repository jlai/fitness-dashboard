import { MapStyle } from "react-map-gl/maplibre";

import { MAPLIBRE_STYLE_URL } from "@/config";

import opentopomapStyle from "./opentopomap.json";
import openstreetmapStyle from "./openstreetmap.json";

export const MAP_STYLE_OPTIONS: Array<{
  id: string;
  label: string;
}> = [
  {
    id: "white",
    label: "Faded",
  },
  {
    id: "light",
    label: "Light",
  },
  {
    id: "dark",
    label: "Dark",
  },
  {
    id: "openstreetmap",
    label: "OpenStreetMap",
  },
  {
    id: "opentopomap",
    label: "OpenTopoMap",
  },
];

export function getMapStyle(name: string): string | MapStyle {
  switch (name) {
    case "light":
    case "white":
      return MAPLIBRE_STYLE_URL?.replace("{STYLE}", name) ?? "";
    case "openstreetmap":
      return openstreetmapStyle as MapStyle;
    case "opentopomap":
      return opentopomapStyle as MapStyle;
    default:
      return MAPLIBRE_STYLE_URL?.replace("{STYLE}", "white") ?? "";
  }
}
