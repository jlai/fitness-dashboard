import { TableCell, TableRow } from "@mui/material";
import dayjs from "dayjs";
import { Explore as LaunchIcon } from "@mui/icons-material";
import { useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";

import type { ExerciseListResponse } from "@/api/exercise/types";
import {
  getExerciseCalories,
  getExerciseDataPointId,
  getExerciseDisplayName,
  getExerciseDistanceKilometers,
  getExerciseDurationMillis,
  getExerciseFromDataPoint,
  getExerciseStartTime,
  getExerciseSteps,
  isPossiblyTracked,
  type ExerciseDataPoint,
} from "@/api/exercise/helpers";
import { formatDuration } from "@/utils/duration-formats";
import { DateFormats } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import { buildGetExerciseListInfiniteQuery } from "@/api/exercise/exercise";
import HistoryList from "@/components/history-list/history-list";

import { exerciseIdHashAtom } from "./details";

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const DISTANCE_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function ActivityLogRow({
  logEntry: dataPoint,
}: {
  logEntry: ExerciseDataPoint;
}) {
  const units = useUnits();
  const setHashLogId = useSetAtom(exerciseIdHashAtom);
  const queryClient = useQueryClient();

  const exercise = getExerciseFromDataPoint(dataPoint);
  const logId = getExerciseDataPointId(dataPoint);
  const steps = getExerciseSteps(exercise);
  const calories = getExerciseCalories(exercise);
  const distance = getExerciseDistanceKilometers(exercise);
  const duration = getExerciseDurationMillis(exercise);
  const startTime = getExerciseStartTime(exercise);
  const activityName = getExerciseDisplayName(exercise);

  const showActivityLogDetails = (event: React.MouseEvent) => {
    queryClient.setQueryData(["exercise", logId], dataPoint);

    setHashLogId(logId);

    event.preventDefault();
  };

  return (
    <TableRow key={logId}>
      <TableCell>
        <a onClick={showActivityLogDetails} href={`#exerciseId=${logId}`}>
          <div className="flex flex-row items-center gap-x-2">
            <div>{DateFormats.formatShortDateTime(dayjs(startTime))}</div>
            {isPossiblyTracked(dataPoint) && (
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
      buildQuery={buildGetExerciseListInfiniteQuery}
      getLogs={(page: ExerciseListResponse) => page.activities ?? []}
      getRowKey={getExerciseDataPointId}
      slots={{ row: ActivityLogRow, headerCells: ActivityLogListHeaderCells }}
    />
  );
}
