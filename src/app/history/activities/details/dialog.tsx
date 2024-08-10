import { DialogContent, IconButton } from "@mui/material";
import dayjs from "dayjs";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useConfirm } from "material-ui-confirm";
import { toast } from "mui-sonner";
import { Delete } from "@mui/icons-material";

import { RequireScopes } from "@/components/require-scopes";
import { ResponsiveDialog } from "@/components/dialogs/responsive-dialog";
import { formatShortDateTime } from "@/utils/date-formats";
import {
  buildDeleteActivityLogMutation,
  buildGetActivityLogQuery,
} from "@/api/activity/activities";

import { ActivityDetails } from "./activity-details";

export function ActivityLogDetailsDialog({
  logId,
  open,
  onClose,
}: {
  logId: number;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { data: activityLog } = useSuspenseQuery(
    buildGetActivityLogQuery(logId)
  );

  const { mutateAsync: deleteActivity } = useMutation(
    buildDeleteActivityLogMutation(queryClient)
  );
  const confirm = useConfirm();

  const { activityName, startTime } = activityLog;

  const handleDeleteClick = () => {
    (async () => {
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

      onClose();
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
        activityLog
          ? `${activityName} on ${formatShortDateTime(dayjs(startTime))}`
          : ""
      }
      titleActions={deleteButton}
      open={open}
      onClose={onClose}
    >
      <DialogContent className="p-0 flex-1 flex flex-col">
        <RequireScopes scopes={["loc"]}>
          <ActivityDetails activityLog={activityLog} />
        </RequireScopes>
      </DialogContent>
    </ResponsiveDialog>
  );
}
