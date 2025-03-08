"use client";

import {
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Add, Delete as DeleteIcon } from "@mui/icons-material";
import { useConfirm } from "material-ui-confirm";
import { useSetAtom } from "jotai";

import {
  DayjsRange,
  MonthNavigator,
} from "@/components/calendar/period-navigator";
import {
  buildDeleteWeightLogMutation,
  buildGetWeightTimeSeriesQuery,
} from "@/api/body";
import { WeightLog } from "@/api/body/types";
import { formatShortDate } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import {
  FRACTION_DIGITS_1,
  PERCENT_FRACTION_DIGITS_1,
} from "@/utils/number-formats";
import { HeaderBar } from "@/components/layout/rows";
import { FlexSpacer } from "@/components/layout/flex";
import CreateWeightLogDialog, {
  createWeightLogDialogOpenAtom,
} from "@/components/logging/create-weight-log";
import { showSuccessToast, withErrorToaster } from "@/components/toast";

function WeightLogRow({
  logEntry: log,
  onDelete,
}: {
  logEntry: WeightLog;
  onDelete: () => void;
}) {
  const units = useUnits();

  return (
    <TableRow>
      <TableCell>{formatShortDate(dayjs(log.date))}</TableCell>
      <TableCell>
        {log.bmi ? <>{FRACTION_DIGITS_1.format(log.bmi)}</> : <>-</>}
      </TableCell>
      <TableCell>
        {log.fat ? (
          <>{PERCENT_FRACTION_DIGITS_1.format(log.fat / 100)}</>
        ) : (
          <>-</>
        )}
      </TableCell>
      <TableCell>
        {FRACTION_DIGITS_1.format(log.weight)} {units.localizedKilogramsName}
      </TableCell>
      <TableCell className="w-[40px]">
        <IconButton onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

export default function WeightLogList() {
  const { weightUnit } = useUnits();

  const setShowingCreateWeightDialog = useSetAtom(
    createWeightLogDialogOpenAtom
  );

  const [range, setRange] = useState<DayjsRange>({
    startDay: dayjs().startOf("month"),
    endDay: dayjs().endOf("month"),
  });

  const { data } = useQuery(
    buildGetWeightTimeSeriesQuery(range.startDay, range.endDay, weightUnit)
  );

  const queryClient = useQueryClient();
  const { mutateAsync: deleteWeightLogId } = useMutation(
    buildDeleteWeightLogMutation(queryClient)
  );

  const confirm = useConfirm();
  const deleteWeightLog = withErrorToaster(async (weightLog: WeightLog) => {
    const { confirmed } = await confirm({
      title: "Delete weight log",
      description: `Delete weight log on ${formatShortDate(
        dayjs(weightLog.date)
      )}?`,
    });

    if (confirmed) {
      await deleteWeightLogId(weightLog.logId);
      showSuccessToast("Deleted weight log");
    }
  }, "Error deleting weight log");

  return (
    <div>
      <HeaderBar>
        <Typography variant="h5">Weight logs</Typography>
        <MonthNavigator value={range} onChange={setRange} />
        <FlexSpacer />
        <Button
          onClick={() => setShowingCreateWeightDialog(true)}
          startIcon={<Add />}
        >
          Log weight
        </Button>
        <CreateWeightLogDialog />
      </HeaderBar>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>BMI</TableCell>
              <TableCell>Fat %</TableCell>
              <TableCell>Weight</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.toReversed().map((logEntry) => (
              <WeightLogRow
                key={logEntry.logId}
                logEntry={logEntry}
                onDelete={() => deleteWeightLog(logEntry)}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
