import { Menu, MenuItem } from "@mui/material";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import React from "react";

export interface PopupMenuOption {
  id: string;
  label: React.ReactNode;
  onClick: () => void;
  hidden?: boolean;
  disabled?: boolean;
}

export function PopupMenu({
  options,
  ButtonComponent,
}: {
  options: Array<PopupMenuOption>;
  ButtonComponent: React.ComponentType;
}) {
  const popupState = usePopupState({
    variant: "popover",
    popupId: "date-field-menu",
  });

  return (
    <>
      <ButtonComponent {...bindTrigger(popupState)} />
      <Menu {...bindMenu(popupState)}>
        {options
          .filter(({ hidden }) => !hidden)
          .map(({ id, label, disabled, onClick }) => (
            <MenuItem
              key={id}
              disabled={disabled}
              onClick={() => {
                onClick();
                popupState.close();
              }}
            >
              {label}
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}
