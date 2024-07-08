"use client";

import {
  Add as AddIcon,
  DirectionsWalk as ActivityIcon,
  Bedtime as SleepIcon,
} from "@mui/icons-material";
import { Fab, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { bindMenu, usePopupState } from "material-ui-popup-state/hooks";
import { useCallback } from "react";
import { useAtom } from "jotai";

import CreateActivityLogDialog, {
  createActivityLogDialogOpenAtom,
} from "./create-activity-log";
import CreateSleepLogDialog, {
  createSleepLogDialogOpenAtom,
} from "./create-sleep-log";

export function LogFab() {
  const [showingCreateActivityLog, setShowingCreateActivityLog] = useAtom(
    createActivityLogDialogOpenAtom
  );

  const [showingCreateSleepLog, setShowingCreateSleepLog] = useAtom(
    createSleepLogDialogOpenAtom
  );

  const popupState = usePopupState({
    variant: "popover",
    popupId: "logger-popup-menu",
  });

  const showCreateActivityLog = useCallback(() => {
    setShowingCreateActivityLog(true);
    popupState.close();
  }, [setShowingCreateActivityLog, popupState]);

  const showCreateSleepLog = useCallback(() => {
    setShowingCreateSleepLog(true);
    popupState.close();
  }, [setShowingCreateSleepLog, popupState]);

  return (
    <div className="fixed bottom-8 right-8">
      <Fab onClick={popupState.open} color="primary">
        <AddIcon />
      </Fab>
      <Menu
        {...bindMenu(popupState)}
        anchorOrigin={{
          vertical: -18,
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={showCreateActivityLog}>
          <ListItemIcon>
            <ActivityIcon />
          </ListItemIcon>
          <ListItemText>Log Activity</ListItemText>
        </MenuItem>
        <MenuItem onClick={showCreateSleepLog}>
          <ListItemIcon>
            <SleepIcon />
          </ListItemIcon>
          <ListItemText>Log Sleep</ListItemText>
        </MenuItem>
      </Menu>
      {showingCreateActivityLog && <CreateActivityLogDialog />}
      {showingCreateSleepLog && <CreateSleepLogDialog />}
    </div>
  );
}
