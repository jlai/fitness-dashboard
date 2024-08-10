"use client";

import { Button, Typography } from "@mui/material";
import { useSetAtom } from "jotai";
import { Add as AddIcon } from "@mui/icons-material";

import { RequireScopes } from "@/components/require-scopes";
import { HeaderBar } from "@/components/layout/rows";
import { FlexSpacer } from "@/components/layout/flex";
import CreateActivityLogDialog, {
  createActivityLogDialogOpenAtom,
} from "@/components/logging/create-activity-log";

import { ActivityLogDetailsHashLoader } from "./details";
import ActivityLogList from "./activity-log-list";

export default function ActivityHistoryPage() {
  const setShowingCreateActivityDialog = useSetAtom(
    createActivityLogDialogOpenAtom
  );

  return (
    <RequireScopes scopes={["act"]}>
      <HeaderBar>
        <Typography variant="h5">Activity logs</Typography>
        <FlexSpacer />
        <Button
          onClick={() => setShowingCreateActivityDialog(true)}
          startIcon={<AddIcon />}
        >
          Log activity
        </Button>
      </HeaderBar>
      <ActivityLogList />
      <ActivityLogDetailsHashLoader />
      <CreateActivityLogDialog />
    </RequireScopes>
  );
}
