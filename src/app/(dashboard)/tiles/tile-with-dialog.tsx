import { Button, Dialog, DialogProps } from "@mui/material";
import {
  bindDialog,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import React, { Suspense } from "react";

import { TileClickableArea } from "./tile";

export interface RenderDialogContentProps {
  closeButton: React.ReactNode;
  close: () => void;
}

export interface TileWithDialogProps {
  children: React.ReactNode;
  dialogComponent: React.ComponentType<RenderDialogContentProps>;
  dialogProps?: Omit<DialogProps, "open" | "onClose">;
}

export function TileWithDialog({
  children,
  dialogComponent,
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
      {popupState.isOpen && (
        <Suspense>
          <Dialog {...dialogProps} {...bindDialog(popupState)}>
            {React.createElement(dialogComponent, {
              close: popupState.close,
              closeButton,
            })}
          </Dialog>
        </Suspense>
      )}
    </>
  );
}
