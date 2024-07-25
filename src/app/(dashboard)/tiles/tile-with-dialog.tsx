import { Button, Dialog, DialogActions, DialogContent } from "@mui/material";
import {
  bindDialog,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import React from "react";

import { TileClickableArea } from "./tile";

interface TileWithDialogProps {
  children: React.ReactNode;
  renderDialogContent(): React.ReactNode;
}

export function TileWithDialog({
  children,
  renderDialogContent,
}: TileWithDialogProps) {
  const popupState = usePopupState({
    popupId: "tile-dialog",
    variant: "dialog",
  });

  return (
    <>
      <TileClickableArea {...bindTrigger(popupState)}>
        {children}
      </TileClickableArea>
      <Dialog {...bindDialog(popupState)}>
        <DialogContent>{renderDialogContent()}</DialogContent>
        <DialogActions>
          <Button onClick={popupState.close}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
