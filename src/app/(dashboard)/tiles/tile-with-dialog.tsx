import {
  Button,
  Dialog,
  DialogProps,
  IconButton,
  IconButtonProps,
} from "@mui/material";
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
  disableDialog?: boolean;
}

export function TileWithDialog({
  children,
  disableDialog,
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
      <TileClickableArea {...(!disableDialog ? bindTrigger(popupState) : {})}>
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

export function IconWithDialog({
  size,
  children,
  disableDialog,
  dialogComponent,
  dialogProps,
}: TileWithDialogProps & {
  size?: IconButtonProps["size"];
}) {
  const popupState = usePopupState({
    popupId: "tile-dialog",
    variant: "dialog",
  });

  const closeButton = <Button onClick={popupState.close}>Close</Button>;

  return (
    <>
      <IconButton
        size={size}
        {...(!disableDialog ? bindTrigger(popupState) : {})}
      >
        {children}
      </IconButton>
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
