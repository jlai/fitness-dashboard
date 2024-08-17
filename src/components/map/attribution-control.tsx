"use client";

import { ControlPosition } from "react-map-gl/maplibre";
import { Map as MapLibreMap } from "maplibre-gl";
import React, { useCallback, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";

import { ReactMapControl } from "./control";

export interface SafeAttributionControlProps {
  position?: ControlPosition;
}

/** Attribution control that sanitizes HTML */
function SafeAttributionControl({
  position = "bottom-right",
}: SafeAttributionControlProps) {
  const [attribution, setAttribution] = useState<string>();
  const [expanded, setExpanded] = useState(true);
  const mapRef = useRef<MapLibreMap>();

  const update = useCallback(() => {
    const sourceCaches = mapRef.current?.style.sourceCaches;

    for (const id in sourceCaches) {
      const sourceCache = sourceCaches[id];
      if (sourceCache.used || sourceCache.usedForTerrain) {
        const source = sourceCache.getSource();
        if (source.attribution) {
          setAttribution(source.attribution);
        }
      }
    }
  }, []);

  const onAdd = useCallback(
    (map: MapLibreMap) => {
      mapRef.current = map;
      map.on("sourcedata", update);

      update();
    },
    [update]
  );

  const onRemove = useCallback(
    (map: MapLibreMap) => {
      map.off("sourcedata", update);

      mapRef.current = undefined;
    },
    [update]
  );

  const safeHtml = useMemo(() => {
    const purifier = DOMPurify();

    purifier.addHook("afterSanitizeAttributes", (node) => {
      if ("target" in node) {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener");
      }
    });

    console.log("purifying", attribution);

    return attribution ? purifier.sanitize(attribution) : "";
  }, [attribution]);

  return (
    <ReactMapControl
      position={position}
      onAdd={onAdd}
      onRemove={onRemove}
      containerClassName=""
    >
      <details
        open={expanded}
        className={`maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact ${
          expanded ? "maplibregl-compact-show" : ""
        }`}
      >
        <summary
          className="maplibregl-ctrl-attrib-button"
          title="Toggle attribution"
          aria-label="Toggle attribution"
          onToggle={() => setExpanded(!expanded)}
        ></summary>
        <div
          className="maplibregl-ctrl-attrib-inner"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        ></div>
      </details>
    </ReactMapControl>
  );
}

export default React.memo(SafeAttributionControl);
