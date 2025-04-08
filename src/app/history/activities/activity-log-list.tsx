import { TableCell, TableRow } from "@mui/material";
import dayjs from "dayjs";
import { Explore as LaunchIcon } from "@mui/icons-material";
import { useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";

import { ActivityLog } from "@/api/activity/types";
import { formatDuration, formatShortDateTime } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import {
  buildGetActivityListInfiniteQuery,
  isPossiblyTracked,
} from "@/api/activity/activities";
import HistoryList from "@/components/history-list/history-list";

import { activityLogIdHashAtom } from "./details";

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const DISTANCE_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function ActivityLogRow({ logEntry: activityLog }: { logEntry: ActivityLog }) {
  const units = useUnits();
  const setHashLogId = useSetAtom(activityLogIdHashAtom);
  const queryClient = useQueryClient();

  const {
    logId,
    steps,
    calories,
    distance,
    duration,
    startTime,
    activityName,
  } = activityLog;

  const showActivityLogDetails = (event: React.MouseEvent) => {
    // Prepopulate query cache
    queryClient.setQueryData(["activity-log", logId], activityLog);

    setHashLogId(logId);

    event.preventDefault();
  };

  return (
    <TableRow key={logId}>
      <TableCell>
        <a onClick={showActivityLogDetails} href={`#activityLogId=${logId}`}>
          <div className="flex flex-row items-center gap-x-2">
            <div>{formatShortDateTime(dayjs(startTime))}</div>
            {isPossiblyTracked(activityLog) && (
              <LaunchIcon className="text-slate-500" />
            )}
          </div>
        </a>
      </TableCell>
      <TableCell>{activityName}</TableCell>
      <TableCell>
        {steps !== undefined ? NUMBER_FORMAT.format(steps) : "\u2014"}
      </TableCell>
      <TableCell>
        {distance ? (
          <div>
            {DISTANCE_FORMAT.format(units.localizedKilometers(distance))}{" "}
            {units.localizedKilometersName}
          </div>
        ) : (
          "\u2014"
        )}
      </TableCell>
      <TableCell>{formatDuration(duration)}</TableCell>
      <TableCell>{NUMBER_FORMAT.format(calories)}</TableCell>
    </TableRow>
  );
}

function ActivityLogListHeaderCells() {
  return (
    <>
      <TableCell>Date</TableCell>
      <TableCell>Activity</TableCell>
      <TableCell>Steps</TableCell>
      <TableCell>Distance</TableCell>
      <TableCell>Duration</TableCell>
      <TableCell>Calories</TableCell>
    </>
  );
}

export default function ActivityLogList() {
  return (
    <HistoryList
      buildQuery={buildGetActivityListInfiniteQuery}
      getLogs={(page) => page.activities ?? []}
      slots={{ row: ActivityLogRow, headerCells: ActivityLogListHeaderCells }}
    />
  );
}
