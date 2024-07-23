"use client";

import { ScopeProvider } from "jotai-scope";
import { Button, Typography } from "@mui/material";
import { useSetAtom } from "jotai";
import { Add as AddIcon } from "@mui/icons-material";

import { RequireScopes } from "@/components/require-scopes";
import { HeaderBar } from "@/components/layout/rows";
import { FlexSpacer } from "@/components/layout/flex";
import CreateActivityLogDialog, {
  createActivityLogDialogOpenAtom,
} from "@/components/logging/create-activity-log";

import { ActivityLogDetailsDialog } from "./details";
import ActivityLogList from "./activity-log-list";
import { showingActivityLogDetailsDialogAtom } from "./details/atoms";

export default function ActivityHistoryPage() {
  const setShowingCreateActivityDialog = useSetAtom(
    createActivityLogDialogOpenAtom
  );

  return (
    <RequireScopes scopes={["act"]}>
      <ScopeProvider atoms={[showingActivityLogDetailsDialogAtom]}>
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
        <ActivityLogDetailsDialog />
        <CreateActivityLogDialog />
      </ScopeProvider>
    </RequireScopes>
  );
}
