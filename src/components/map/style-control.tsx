import { ControlPosition, useControl } from "react-map-gl/maplibre";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { Check } from "@mui/icons-material";

import { MAP_STYLE_OPTIONS } from "./styles";

export interface MapStyleControlProps {
  position?: ControlPosition;
  style: string;
  onChange: (style: string) => void;
}

const ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    viewBox="0 0 256 256"
  >
    <g fill="#5f6368">
      <path d="M160 72v144l-64-32V40Z" opacity="0.2" />
      <path d="M228.92 49.69a8 8 0 0 0-6.86-1.45l-61.13 15.28l-61.35-30.68a8 8 0 0 0-5.52-.6l-64 16A8 8 0 0 0 24 56v144a8 8 0 0 0 9.94 7.76l61.13-15.28l61.35 30.68a8.15 8.15 0 0 0 3.58.84a8 8 0 0 0 1.94-.24l64-16A8 8 0 0 0 232 200V56a8 8 0 0 0-3.08-6.31M104 52.94l48 24v126.12l-48-24Zm-64 9.31l48-12v127.5l-48 12Zm176 131.5l-48 12V78.25l48-12Z" />
    </g>
  </svg>
);

function createContainer() {
  const container = document.createElement("div");
  container.className = "maplibregl-ctrl maplibregl-ctrl-group";
  return container;
}

function MapStyleControl({ position, style, onChange }: MapStyleControlProps) {
  const [container] = useState(createContainer);
  const popupState = usePopupState({
    variant: "popper",
    popupId: "map-style-menu",
  });

  useControl(
    () => ({
      onAdd() {
        return container;
      },
      onRemove() {},
    }),
    {
      position: position,
    }
  );

  return ReactDOM.createPortal(
    <>
      <button aria-label="change style" {...bindTrigger(popupState)}>
        <div className="p-1">{ICON}</div>
      </button>
      <Menu {...bindMenu(popupState)}>
        {MAP_STYLE_OPTIONS.map(({ id, label }) => (
          <MenuItem
            key={id}
            onClick={() => {
              onChange(id);
              popupState.close();
            }}
          >
            <ListItemIcon>{style === id && <Check />}</ListItemIcon>
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>,
    container
  );
}

export default React.memo(MapStyleControl);
