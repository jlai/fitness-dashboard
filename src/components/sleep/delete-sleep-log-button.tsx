"use client";

import { IconButton } from "@mui/material";
import { Delete } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "material-ui-confirm";
import dayjs from "dayjs";

import { isDataPointFromThisApp } from "@/api/datapoints";
import {
  buildDeleteSleepLogMutation,
  getSleepDataPointName,
  getSleepEndTime,
  getSleepFromDataPoint,
  type SleepDataPoint,
} from "@/api/sleep";
import { DateFormats } from "@/utils/date-formats";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

export function DeleteSleepLogButton({
  dataPoint,
  onDeleted,
}: {
  dataPoint: SleepDataPoint;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const { mutateAsync: deleteSleepLog } = useMutation(
    buildDeleteSleepLogMutation(queryClient),
  );
  const confirm = useConfirm();

  const name = getSleepDataPointName(dataPoint);
  const sleep = getSleepFromDataPoint(dataPoint);
  const endTime = getSleepEndTime(sleep);

  const handleDeleteClick = withErrorToaster(async () => {
    const { confirmed } = await confirm({
      title: "Delete sleep log?",
      description: `Delete sleep log ending ${DateFormats.formatShortDateTime(
        dayjs(endTime),
      )}? This cannot be undone.`,
      confirmationText: "Delete",
      confirmationButtonProps: { color: "warning" },
    });

    if (confirmed) {
      await deleteSleepLog(name);
      showSuccessToast("Deleted sleep log");
      onDeleted?.();
    }
  }, "Error deleting sleep log");

  if (!name || !isDataPointFromThisApp(dataPoint)) {
    return null;
  }

  return (
    <IconButton aria-label="delete" onClick={handleDeleteClick}>
      <Delete />
    </IconButton>
  );
}
