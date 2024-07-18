import {
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
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
  const [fullScreen, setFullScreen] = useState(false);
  const [showingActivityLog, setShowingActivityLog] = useAtom(
    showingActivityLogDetailsDialogAtom
  );

  return (
    <Dialog
      fullWidth
      fullScreen={fullScreen}
      maxWidth="xl"
      open={!!showingActivityLog}
      onClose={() => setShowingActivityLog(null)}
    >
      <DialogActions>
        <IconButton
          aria-label="toggle fullscreen"
          onClick={() => setFullScreen(!fullScreen)}
        >
          {fullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
        <IconButton
          aria-label="close"
          onClick={() => setShowingActivityLog(null)}
        >
          <CloseIcon />
        </IconButton>
      </DialogActions>
      <DialogContent className="p-0">
        <RequireScopes scopes={["loc"]}>
          {showingActivityLog && (
            <ActivityDetails activityLog={showingActivityLog} />
          )}
        </RequireScopes>
      </DialogContent>
    </Dialog>
  );
}
