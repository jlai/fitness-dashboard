import {
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAtom } from "jotai";
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material";
import { useState } from "react";

import { RequireScopes } from "@/components/require-scopes";

import { showingActivityLogDetailsDialogAtom } from "./atoms";
import { ActivityDetails } from "./activity-details";

export function ActivityLogDetailsDialog() {
  const theme = useTheme();
  const isMobileSize = !useMediaQuery(theme.breakpoints.up("sm"));

  const [fullScreen, setFullScreen] = useState(false);
  const [showingActivityLog, setShowingActivityLog] = useAtom(
    showingActivityLogDetailsDialogAtom
  );

  return (
    <Dialog
      fullWidth
      fullScreen={isMobileSize || fullScreen}
      maxWidth="xl"
      open={!!showingActivityLog}
      onClose={() => setShowingActivityLog(null)}
    >
      <DialogActions>
        {!isMobileSize && (
          <IconButton
            aria-label="toggle fullscreen"
            onClick={() => setFullScreen(!fullScreen)}
          >
            {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
          </IconButton>
        )}
        <IconButton
          aria-label="close"
          onClick={() => setShowingActivityLog(null)}
        >
          <CloseIcon />
        </IconButton>
      </DialogActions>
      <DialogContent className="p-0 flex-1 flex flex-col">
        <RequireScopes scopes={["loc"]}>
          {showingActivityLog && (
            <ActivityDetails activityLog={showingActivityLog} />
          )}
        </RequireScopes>
      </DialogContent>
    </Dialog>
  );
}
