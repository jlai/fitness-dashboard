"use client";

import { Dialog, DialogContent } from "@mui/material";
import { useState } from "react";

import { ActivityLog } from "@/api/activity";
import { RequireScopes } from "@/components/require-scopes";

import { ActivityDetails } from "./activity-details";
import ActivityLogList from "./activity-log-list";

export default function ActivityHistoryPage() {
  const [selectedActivityLog, setSelectedActivityLog] =
    useState<ActivityLog | null>(null);

  return (
    <RequireScopes scopes={["pro", "act"]}>
      <ActivityLogList onShowActivityLog={setSelectedActivityLog} />
      <Dialog
        fullWidth
        maxWidth="xl"
        open={!!selectedActivityLog}
        onClose={() => setSelectedActivityLog(null)}
      >
        <DialogContent>
          <RequireScopes scopes={["loc"]}>
            {selectedActivityLog && (
              <ActivityDetails activityLog={selectedActivityLog} />
            )}
          </RequireScopes>
        </DialogContent>
      </Dialog>
    </RequireScopes>
  );
}
