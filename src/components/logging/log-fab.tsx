"use client";

import {
  Add as AddIcon,
  DirectionsWalk as ActivityIcon,
  Bedtime as SleepIcon,
  MonitorWeight as WeightIcon,
} from "@mui/icons-material";
import { Fab, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { bindMenu, usePopupState } from "material-ui-popup-state/hooks";
import { useAtom } from "jotai";

import CreateActivityLogDialog, {
  createActivityLogDialogOpenAtom,
} from "./create-activity-log";
import CreateSleepLogDialog, {
  createSleepLogDialogOpenAtom,
} from "./create-sleep-log";
import CreateWeightLogDialog, {
  createWeightLogDialogOpenAtom,
} from "./create-weight-log";

function LogMenuItem({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <MenuItem onClick={onClick} className="py-4">
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText>{children}</ListItemText>
    </MenuItem>
  );
}

export function LogFab() {
  const [showingCreateActivityLog, setShowingCreateActivityLog] = useAtom(
    createActivityLogDialogOpenAtom
  );

  const [showingCreateSleepLog, setShowingCreateSleepLog] = useAtom(
    createSleepLogDialogOpenAtom
  );

  const [showingCreateWeightLog, setShowingCreateWeightLog] = useAtom(
    createWeightLogDialogOpenAtom
  );

  const popupState = usePopupState({
    variant: "popover",
    popupId: "logger-popup-menu",
  });

  const showCreateActivityLog = () => {
    setShowingCreateActivityLog(true);
    popupState.close();
  };

  const showCreateSleepLog = () => {
    setShowingCreateSleepLog(true);
    popupState.close();
  };

  const showCreateWeightLog = () => {
    setShowingCreateWeightLog(true);
    popupState.close();
  };

  return (
    <div className="fixed bottom-8 right-8">
      <Fab onClick={popupState.open} color="primary">
        <AddIcon />
      </Fab>
      <Menu
        slotProps={{ paper: { sx: { borderRadius: "12px" } } }}
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
        <LogMenuItem icon={<ActivityIcon />} onClick={showCreateActivityLog}>
          Log Activity
        </LogMenuItem>
        <LogMenuItem icon={<SleepIcon />} onClick={showCreateSleepLog}>
          Log Sleep
        </LogMenuItem>
        <LogMenuItem icon={<WeightIcon />} onClick={showCreateWeightLog}>
          Log Weight
        </LogMenuItem>
      </Menu>
      {showingCreateActivityLog && <CreateActivityLogDialog />}
      {showingCreateSleepLog && <CreateSleepLogDialog />}
      {showingCreateWeightLog && <CreateWeightLogDialog />}
    </div>
  );
}
