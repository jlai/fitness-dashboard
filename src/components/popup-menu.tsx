import { ArrowDropDown } from "@mui/icons-material";
import { IconButton, Menu, MenuItem } from "@mui/material";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";

export interface PopupMenuOption {
  id: string;
  label: string;
  onClick: () => void;
  hidden?: boolean;
}

export function PopupMenu({
  options,
  disabled,
}: {
  options: Array<PopupMenuOption>;
  disabled?: boolean;
}) {
  const popupState = usePopupState({
    variant: "popover",
    popupId: "date-field-menu",
  });

  return (
    <>
      <IconButton
        aria-label="date actions"
        disabled={disabled}
        {...bindTrigger(popupState)}
      >
        <ArrowDropDown />
      </IconButton>
      <Menu {...bindMenu(popupState)}>
        {options
          .filter(({ hidden }) => !hidden)
          .map(({ id, label, onClick }) => (
            <MenuItem
              key={id}
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
