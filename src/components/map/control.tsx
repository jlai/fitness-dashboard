import { ControlPosition, useControl } from "react-map-gl/maplibre";
import { Map as MapLibreMap } from "maplibre-gl";
import React, { useState } from "react";
import ReactDOM from "react-dom";

export interface ReactMapControlProps {
  position?: ControlPosition;
  children: React.ReactNode;
  onAdd?: (map: MapLibreMap) => void;
  onRemove?: (map: MapLibreMap) => void;
  containerClassName?: string;
}

function createContainer(className: string) {
  const container = document.createElement("div");
  container.className = className;
  return container;
}

/** Attribution control that sanitizes HTML */
export function ReactMapControl({
  position,
  children,
  onAdd,
  onRemove,
  containerClassName = "maplibre-ctrl",
}: ReactMapControlProps) {
  const [container] = useState(createContainer(containerClassName));

  useControl(
    () => ({
      onAdd(map: MapLibreMap) {
        onAdd?.(map);

        return container;
      },
      onRemove(map: MapLibreMap) {
        onRemove?.(map);

        container.remove();
      },
    }),
    {
      position: position,
    }
  );

  if (container.className !== containerClassName) {
    container.className = containerClassName;
  }

  return ReactDOM.createPortal(children, container);
}
