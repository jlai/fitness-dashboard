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
  showCloseButton?: boolean;

  /** If provided, remember fullscreen setting for this dialog type. */
  fullScreenPreferenceId?: string;
}

export function ResponsiveDialog({
  open,
  onClose,
  children,
  title,
  fullScreen: initialFullScreen,
  fullScreenPreferenceId = "",
  showCloseButton = true,
  ...dialogProps
}: ResponsiveDialogProps & DialogProps) {
  const theme = useTheme();
  const isMobileSize = !useMediaQuery(theme.breakpoints.up("sm"));
  const [fullScreenPreference, setFullScreenPreference] = useAtom(
    fullScreenPreferenceId
      ? fullScreenPreferenceFamily(fullScreenPreferenceId)
      : atom(false)
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
      title={title}
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
        showFullScreenToggle={!isMobileSize}
        showCloseButton={showCloseButton}
        onClose={onClose}
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
  showCloseButton = true,
}: {
  title?: string;
  fullScreen?: boolean;
  onClose?: (event: SyntheticEvent) => void;
  setFullScreen: (enabled: boolean) => void;
  showFullScreenToggle: boolean;
  showCloseButton?: boolean;
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
