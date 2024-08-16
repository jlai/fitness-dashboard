import { MapStyle } from "react-map-gl/maplibre";

import { MAPLIBRE_STYLE_URL } from "@/config";

import opentopomapStyle from "./opentopomap.json";

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
    id: "opentopomap",
    label: "Topography",
  },
];

export function getMapStyle(name: string): string | MapStyle {
  switch (name) {
    case "light":
    case "white":
      return MAPLIBRE_STYLE_URL?.replace("{STYLE}", name) ?? "";
    case "opentopomap":
      return opentopomapStyle as MapStyle;
    default:
      return MAPLIBRE_STYLE_URL?.replace("{STYLE}", "white") ?? "";
  }
}
