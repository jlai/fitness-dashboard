import { Close, Fullscreen, FullscreenExit } from "@mui/icons-material";
import {
  Dialog,
  DialogProps,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { SyntheticEvent, useState } from "react";
import { atom, useAtom } from "jotai";

import { FlexSpacer } from "../layout/flex";

import { fullScreenPreferenceFamily } from "./atoms";

interface ResponsiveDialogProps {
  open: boolean;
  onClose?: (event: SyntheticEvent) => void;
  children?: React.ReactNode;
  title: string;
  fullScreen?: boolean;
  showFullScreenToggle?: boolean;
  showCloseButton?: boolean;
  titleActions?: React.ReactNode;

  /** If provided, remember fullscreen setting for this dialog type. */
  fullScreenPreferenceId?: string;
}

// Atom that always returns false and ignores writes
const falseAtom = atom(
  () => false,
  () => {}
);

export function ResponsiveDialog({
  open,
  onClose,
  children,
  title,
  titleActions,
  fullScreen: initialFullScreen,
  fullScreenPreferenceId = "",
  showFullScreenToggle,
  showCloseButton = true,
  ...dialogProps
}: ResponsiveDialogProps & DialogProps) {
  const theme = useTheme();
  const isMobileSize = !useMediaQuery(theme.breakpoints.up("sm"));

  const [fullScreenPreference, setFullScreenPreference] = useAtom(
    fullScreenPreferenceId
      ? fullScreenPreferenceFamily(fullScreenPreferenceId)
      : falseAtom
  );

  const [fullScreen, setFullScreen] = useState(
    isMobileSize || initialFullScreen || fullScreenPreference
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullScreen={fullScreen}
      {...dialogProps}
    >
      <ResponsiveDialogTitleBar
        title={title}
        fullScreen={fullScreen}
        setFullScreen={(value) => {
          setFullScreen(value);

          if (fullScreenPreferenceId) {
            setFullScreenPreference(value);
          }
        }}
        showFullScreenToggle={showFullScreenToggle ?? !isMobileSize}
        showCloseButton={showCloseButton}
        onClose={onClose}
        actions={titleActions}
      />
      {children}
    </Dialog>
  );
}

export function ResponsiveDialogTitleBar({
  title,
  fullScreen,
  setFullScreen,
  showFullScreenToggle,
  onClose,
  actions,
  showCloseButton = true,
}: {
  title?: string;
  fullScreen?: boolean;
  onClose?: (event: SyntheticEvent) => void;
  setFullScreen: (enabled: boolean) => void;
  showFullScreenToggle: boolean;
  showCloseButton?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <Stack
      minHeight="56px"
      direction="row"
      alignItems="center"
      marginInlineStart={showCloseButton || fullScreen ? "0px" : "24px"}
    >
      {(showCloseButton || fullScreen) && (
        <IconButton aria-label="close" onClick={onClose}>
          <Close />
        </IconButton>
      )}
      <Typography variant="h6">{title}</Typography>
      <FlexSpacer />
      {actions}
      {showFullScreenToggle && (
        <IconButton
          aria-label="toggle fullscreen"
          onClick={() => setFullScreen(!fullScreen)}
        >
          {fullScreen ? <FullscreenExit /> : <Fullscreen />}
        </IconButton>
      )}
    </Stack>
  );
}
