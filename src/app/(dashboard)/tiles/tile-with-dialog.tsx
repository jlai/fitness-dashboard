import { Button, Dialog, DialogProps } from "@mui/material";
import {
  bindDialog,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import React from "react";

import { TileClickableArea } from "./tile";

export interface RenderDialogContentProps {
  closeButton: React.ReactNode;
  close: () => void;
}

export interface TileWithDialogProps {
  children: React.ReactNode;
  renderDialogContent(options: RenderDialogContentProps): React.ReactNode;
  dialogProps?: Omit<DialogProps, "open" | "onClose">;
}

export function TileWithDialog({
  children,
  renderDialogContent,
  dialogProps,
}: TileWithDialogProps) {
  const popupState = usePopupState({
    popupId: "tile-dialog",
    variant: "dialog",
  });

  const closeButton = <Button onClick={popupState.close}>Close</Button>;

  return (
    <>
      <TileClickableArea {...bindTrigger(popupState)}>
        {children}
      </TileClickableArea>
      <Dialog {...dialogProps} {...bindDialog(popupState)}>
        {renderDialogContent({ close: popupState.close, closeButton })}
      </Dialog>
    </>
  );
}
