"use client";

import { Typography, Button } from "@mui/material";
import { useSetAtom } from "jotai";
import { Add as AddIcon } from "@mui/icons-material";

import { RequireScopes } from "@/components/require-scopes";
import { FlexSpacer } from "@/components/layout/flex";
import { HeaderBar } from "@/components/layout/rows";
import CreateSleepLogDialog, {
  createSleepLogDialogOpenAtom,
} from "@/components/logging/create-sleep-log";

import SleepLogList from "./sleep-log-list";

export default function SleepHistoryPage() {
  const setShowingCreateSleepDialog = useSetAtom(createSleepLogDialogOpenAtom);

  return (
    <RequireScopes scopes={["sle"]}>
      <HeaderBar>
        <Typography variant="h5">Sleep logs</Typography>
        <FlexSpacer />
        <Button
          onClick={() => setShowingCreateSleepDialog(true)}
          startIcon={<AddIcon />}
        >
          Log sleep
        </Button>
      </HeaderBar>
      <SleepLogList />
      <CreateSleepLogDialog />
    </RequireScopes>
  );
}
