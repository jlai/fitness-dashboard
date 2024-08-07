import { DialogContent } from "@mui/material";
import { useAtom } from "jotai";
import dayjs from "dayjs";

import { RequireScopes } from "@/components/require-scopes";
import { ResponsiveDialog } from "@/components/dialogs/responsive-dialog";
import { formatShortDateTime } from "@/utils/date-formats";

import { showingActivityLogDetailsDialogAtom } from "./atoms";
import { ActivityDetails } from "./activity-details";

export function ActivityLogDetailsDialog() {
  const [showingActivityLog, setShowingActivityLog] = useAtom(
    showingActivityLogDetailsDialogAtom
  );

  return (
    <ResponsiveDialog
      maxWidth="xl"
      fullWidth
      fullScreenPreferenceId="activity"
      title={
        showingActivityLog
          ? `${showingActivityLog.activityName} on ${formatShortDateTime(
              dayjs(showingActivityLog.startTime)
            )}`
          : ""
      }
      open={!!showingActivityLog}
      onClose={() => setShowingActivityLog(null)}
    >
      <DialogContent className="p-0 flex-1 flex flex-col">
        <RequireScopes scopes={["loc"]}>
          {showingActivityLog && (
            <ActivityDetails activityLog={showingActivityLog} />
          )}
        </RequireScopes>
      </DialogContent>
    </ResponsiveDialog>
  );
}
