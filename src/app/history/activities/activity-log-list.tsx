import {
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TableFooter,
  Skeleton,
} from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import dayjs, { Dayjs } from "dayjs";
import { Explore as LaunchIcon } from "@mui/icons-material";
import { useSetAtom } from "jotai";

import { ActivityLog, GetActivityLogListResponse } from "@/api/activity/types";
import { makeRequest } from "@/api/request";
import { formatDuration, formatShortDateTime } from "@/utils/date-formats";
import { useUnits } from "@/config/units";
import JumpTo from "@/components/jump-to";
import { formatAsDate } from "@/api/datetime";
import { isPossiblyTracked } from "@/api/activity/activities";

import { showingActivityLogDetailsDialogAtom } from "./atoms";

const NUMBER_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

const DISTANCE_FORMAT = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
});

function ActivityLogRow({ activityLog }: { activityLog: ActivityLog }) {
  const units = useUnits();
  const showActivityLogDetails = useSetAtom(
    showingActivityLogDetailsDialogAtom
  );

  return (
    <TableRow key={activityLog.logId}>
      <TableCell>
        <button onClick={() => showActivityLogDetails(activityLog)}>
          <div className="flex flex-row items-center gap-x-2">
            <div>{formatShortDateTime(dayjs(activityLog.startTime))}</div>
            {isPossiblyTracked(activityLog) && (
              <LaunchIcon className="text-slate-500" />
            )}
          </div>
        </button>
      </TableCell>
      <TableCell>{activityLog.activityName}</TableCell>
      <TableCell>{NUMBER_FORMAT.format(activityLog.steps)}</TableCell>
      <TableCell>
        {activityLog.distance ? (
          <div>
            {DISTANCE_FORMAT.format(
              units.localizedKilometers(activityLog.distance)
            )}{" "}
            {units.localizedKilometersName}
          </div>
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell>{formatDuration(activityLog.duration)}</TableCell>
      <TableCell>{NUMBER_FORMAT.format(activityLog.calories)}</TableCell>
    </TableRow>
  );
}

export default function ActivityLogList() {
  const [pageNumber, setPageNumber] = useState(0);
  const [initialDay, setInitialDay] = useState(dayjs());

  const { data, hasNextPage, fetchNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["activity-log-list", formatAsDate(initialDay)],
    queryFn: async ({ pageParam }) => {
      const queryString =
        pageParam ||
        `limit=10&offset=0&sort=desc&beforeDate=${encodeURIComponent(
          initialDay.toISOString().replace("Z", "")
        )}`;

      const response = await makeRequest(
        `/1/user/-/activities/list.json?${queryString}`
      );
      return (await response.json()) as GetActivityLogListResponse;
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.next
        ? new URL(lastPage.pagination.next).search.replace(/^\?/, "")
        : null,
    initialPageParam: "",
  });

  const numLoadedPages = data?.pages.length ?? 0;

  const changePageNumber = useCallback(
    (newPageNumber: number) => {
      if (newPageNumber > numLoadedPages - 1) {
        fetchNextPage();
      }

      setPageNumber(newPageNumber);
    },
    [setPageNumber, fetchNextPage, numLoadedPages]
  );

  const changeInitialDay = useCallback(
    (value: Dayjs | null) => {
      setInitialDay(value ?? dayjs());
      setPageNumber(0);
    },
    [setPageNumber, setInitialDay]
  );

  const page = data?.pages[pageNumber];

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Activity</TableCell>
            <TableCell>Steps</TableCell>
            <TableCell>Distance</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell>Calories</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {page?.activities.map((activityLog) => (
            <ActivityLogRow key={activityLog.logId} activityLog={activityLog} />
          ))}
          {[...Array(10 - (page?.activities.length ?? 0)).fill(0)].map(
            (_, i) => (
              <TableRow key={`filler-${i}`}>
                <TableCell colSpan={1000}>
                  {isFetching ? <Skeleton variant="text" /> : " "}
                </TableCell>
              </TableRow>
            )
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              <JumpTo onPickDay={(day) => changeInitialDay(day)} />
            </TableCell>
            <TablePagination
              colSpan={5}
              count={
                hasNextPage
                  ? -1
                  : data?.pages.reduce(
                      (acc, page) => acc + page.activities.length,
                      0
                    ) ?? -1
              }
              rowsPerPageOptions={[]}
              rowsPerPage={10}
              page={pageNumber}
              onPageChange={(event, newPageNumber) =>
                changePageNumber(newPageNumber)
              }
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}
