import { DialogContent, IconButton } from "@mui/material";
import { useAtom } from "jotai";
import dayjs from "dayjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";
import { Delete } from "@mui/icons-material";

import { RequireScopes } from "@/components/require-scopes";
import { ResponsiveDialog } from "@/components/dialogs/responsive-dialog";
import { formatShortDateTime } from "@/utils/date-formats";
import { buildDeleteActivityLogMutation } from "@/api/activity/activities";

import { showingActivityLogDetailsDialogAtom } from "./atoms";
import { ActivityDetails } from "./activity-details";

export function ActivityLogDetailsDialog() {
  const [showingActivityLog, setShowingActivityLog] = useAtom(
    showingActivityLogDetailsDialogAtom
  );

  const queryClient = useQueryClient();
  const { mutateAsync: deleteActivity } = useMutation(
    buildDeleteActivityLogMutation(queryClient)
  );
  const confirm = useConfirm();

  const handleDeleteClick = () => {
    (async () => {
      if (!showingActivityLog) {
        return;
      }

      const { logId, activityName, startTime } = showingActivityLog;

      await confirm({
        title: "Delete activity log?",
        description: `Delete ${activityName} activity log at ${formatShortDateTime(
          dayjs(startTime)
        )}? This cannot be undone.`,
        confirmationText: "Delete",
        confirmationButtonProps: { color: "warning" },
      });
      await deleteActivity(logId);
      toast.success(`Deleted ${activityName} activity`);

      setShowingActivityLog(null);
    })();
  };

  const deleteButton = (
    <IconButton aria-label="delete" onClick={handleDeleteClick}>
      <Delete />
    </IconButton>
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
      titleActions={deleteButton}
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
